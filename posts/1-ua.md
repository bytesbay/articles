---

title: Готуємо ChainSyncer 
subtitle: Колекція рецептів з використання модуля ChainSyncer 
cover_image: https://github.com/bytesbay/articles/raw/main/resources/1-ua-1w.jpg
tags:
  - web3
  - blockchain
  - architecture
  - nodejs
  - ethereum # only for medium

---

{% if source == "devto" %}

Як і обіцяв у  [минулій статті](https://dev.to/bytesbay/sinkhronizatsiia-biekiendu-z-blokchieinom-l7b), Я напишу невеликі рекомендації щодо використання модуля [ChainSyncer](https://github.com/bytesbay/chain-syncer).

{% else if source == "hashnode" %}

Як і обіцяв у [минулій статті](https://bytesbay.hashnode.dev/sinhronizaciya-bekendu-z-blokchejnom),  Я напишу невеликі рекомендації щодо використання модуля [ChainSyncer](https://github.com/bytesbay/chain-syncer).

{% endif %}

## Максимальна узгодженість

Через асинхронні характеристики модуля та надмірної складності RPC серверів,при взаємодії з модулем потрібні деякі хитрощі,для того щоб підтримувати узгодженність з блокчейном.

Напариклад: Ми маємо абстрактний контракт на стейкінг.

```solidity
// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

/**
  * Some very-very abstract staking contract without any sense
  */
contract Staking {

  struct Pool {
    uint256 total_staked;
  }

  mapping(uint256 => Pool) pools;

  event Staked(
    uint256 indexed pool_id,
    address staked_by,
    uint256 current_total_staked
  );

  function stake(uint256 pool_id_, uint256 amount_) external {
    pools[pool_id_].total_staked += amount_;

    emit Staked(pool_id_, msg.sender, pools[pool_id_].total_staked);
  }
}
```

Завдання полягає в тому щоб відстежити кількість токенів у пулі в умовах високого навантаження контракту (припустимо, дуже популярного).

Робитимемо це за допомогою `Staked` події.

```javascript
// Example using Mongoose
// This is just an abstract example, dont try to copy-paste it

const Mongoose = require('mongoose');
const { ChainSyncer } = require('chain-syncer');
const { MongoDBAdapter } = require('@chainsyncer/mongodb-adapter');

// where will we store the pulled events
await Mongoose.connect(process.env['MONGO_SRV']);

const adapter = new MongoDBAdapter(Mongoose.connection.db);
const syncer = new ChainSyncer(adapter, { /* ... some options ... */ })

syncer.on('Staking.Staked', async (
  { global_index }, // will need in the next example
  pool_id,
  staked_by, // actually dont need
  current_total_staked,
) => {

  await StakingPool.updateOne({
    _id: pool_id,
  }, {
    $set: {
      total_staked: Number(current_total_staked),
    },
  });

});
```

Обов'язково потрібно переконатись, що наші обробники є **ідемпотентними**. Це можливо тільки у тому випадку, якщо ви проєктуете події таким чином,щоб вони зберігали поточний моментальний знімок даних: у нашому випадку `total_staked`.Навпаки, якщо ми збережемо `amount_`, то нам доведеться продивитись усі події тільки для того щоб дізнатись, скільки зараз застейкано. Це дуже ускладнить код.

У наданому вище коді ховалася доволі серйозна помилка. Оскільки модуль обробляє події паралельно пакетами (для максимальної продуктивності), цілком ймовірно, що більш рання подія буде оброблена після більш пізньої. У результаті, `total_staked` на вашому сервері буде менше, ніж повинно бути.


![Проблема послідовності обробки подій](/resources/1-ua-2.jpg)

Тут у гру вступає параметр `global_index`. З його допомогою ми можемо визначити найбільш актуальний стан `total_staked` пула.


![Вирішення проблеми послідовності обробки подій з використанням global_index](/resources/1-ua-3.jpg)

Додаючи деякі правки у наш обробник, ми можемо прибрати ризики помилок синхронізації:

```javascript
syncer.on('Staking.Staked', async (
  { global_index }, // we need only global_index
  pool_id,
  staked_by, // actually dont need
  current_total_staked,
) => {

  await StakingPool.updateOne({
    _id: pool_id,

    // we need to update total_staked only if global_index is greater than the last one saved
    last_synced_at: { $lt: global_index },
  }, {
    $set: {
      total_staked: Number(current_total_staked),

      // dont't forget to save
      last_synced_at: global_index,
    },
  });

});
```

Ви, напевно, спитаєте: Звідки береться цей параметр?
Він збирається ChainSyncer'ом для кожної події шляхом поєднання `blockNumber` та `logIndex`.


![З чого складається global_index ](/resources/1-ua-4.jpg)

Таким чином, ми отримуємо щось на зразок додаткового унікального ID для кожної події.

---

## Перенесення подій

Іншою функцією, призначеною для вирішення проблем асинхронності модуля, є збереження послідовності обробки подій.

Я наведу вам приклад. У вас є об’єкт меча для вашої крипто-гри, який повністю зберігається в контракті.

```solidity
// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract Swords {

  struct Sword {
    uint256 damage;
    bool is_enchanted;
  }

  Sword[] public swords;

  event Created(
    uint256 sword_id,
    uint256 damage
  );

  event Enchanted(
    uint256 sword_id
  );

  function _create(uint256 damage_) internal returns (uint256) {

    uint256 sword_id = swords.length;
    swords.push(Sword(damage_, false));

    return sword_id;
  }

  function create(uint256 damage_) external {
    
    uint256 sword_id = _create(damage_);
    
    emit Created(sword_id, damage_);
  }


  function createAndEnchant(uint256 damage_) external {
    
    uint256 sword_id = _create(damage_);
    swords[sword_id].is_enchanted = true;
    
    emit Created(sword_id, damage_);
    emit Enchanted(sword_id);
  }
}
```

У нас також є backend який відстежує статус кожного меча в контракті.

```javascript
syncer.on('Swords.Created', async (
  { global_index, block_timestamp }, // don't need
  sword_id,
  damage
) => {

  // uint256 that comes from event syncer converts to string, but we need a number
  sword_id = Number(sword_id);
  damage = Number(damage);

  // getting the sword by id 
  const sword = await Sword.findOne({ _id: sword_id });
  
  // will create a new one, if no sword found in our DB
  if(!sword) {

    await Sword.create({
      _id: sword_id,
      damage: damage,
      is_enchanted: false,
    });
  }

});


syncer.on('Swords.Enchanted', async (
  { global_index, block_timestamp }, // don't need
  sword_id,
) => {

  sword_id = Number(sword_id);

  await Sword.updateOne({
    _id: sword_id,
  }, {
    $set: {
      is_enchanted: true, // updating owner address
    }
  });

});
```

Як я описав вище, події обробляються паралельно, і в цьому прикладі нам потрібна чітка послідовність виконання обробників. Оскільки `Enchanted` і `Created` створюються в одній транзакції, існує надзвичайно високий ризик того, що подія `Enchanted` буде оброблено раніше події `Created`, що призведе до втрати узгодженості.

Щоб усунути ймовірність цієї помилки, ChainSyncer має цивільний механізм для відкладення подій: якщо `false` повертається з обробника, то обробка події відкладається на наступну ітерацію.

```javascript
syncer.on('Swords.Enchanted', async (
  { global_index, block_timestamp }, // don't need
  sword_id,
) => {

  sword_id = Number(sword_id);

  // getting the sword by id 
  const sword = await Sword.findOne({ _id: sword_id });
  
  // if no sword found in our DB, 
  // we will postpone this event till the sword will be created
  if(!sword) {
    return false;
  }

  await Sword.updateOne({
    _id: sword_id,
  }, {
    $set: {
      is_enchanted: true, // updating owner address
    }
  });

});
```

Використовуючи цей механізм, ми отримуємо щось на зразок графіка залежності подій.

На даний момент це все. Використовуючи ці практики, ви отримаєте не тільки високу ефективність, а й надійну узгодженість, щоб ви могли міцно спати.

У наступній статті я розповім вам про більш глибоку роботу з модулем — сканування окремих блоків, режим сканера і, можливо, щось більше.

---

Друзі, не забуваємо донатити на 🇺🇦 ЗСУ. Залишу [посилання](https://aid.prytulafoundation.org/en/) для тих хто в танку.
