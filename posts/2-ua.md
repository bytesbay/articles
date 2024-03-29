---

title: Moralis Streams проти ChainSyncer
subtitle: Порівняння двох інструментів, що робить розробку офчейнових dApps можливою
cover_image: https://github.com/bytesbay/articles/raw/main/resources/2-1-v3.jpg
medium_image: https://github.com/bytesbay/articles/raw/main/resources/2-1-v3.jpg
medium_tags:
  - web3
  - blockchain-development
  - moralis
  - nodejs
  - ethereum
  
tags:
  - moralis
  - architecture
  - blockchain
  - web3

---
Вітаю друзі, ласкаво прошу до моеї статті про Moralis Streams та ChainSyncer - два інструменти, які можуть полегшити ваше життя під час роботи з блокчейном.
## Що таке Moralis Streams?

[Moralis Streams](https://moralis.io/streams) це популярний API для налаштування Web3 потоків. Це зручно для користувача та спрощує потокову передачу даних блокчейну у вашу програму чи серверну частину проектів Web3. Це чудовий варіант для тих, хто не хоче витрачати багато часу на створення складної інфраструктури для обробки даних блокчейну.

## ChainSyncer - Що це?

[ChainSyncer](https://github.com/bytesbay/chain-syncer) це рішення з відкритим кодом, яке дозволяє вам легко налаштувати блокчейн-прослуховувачі та перехоплювати події в ланцюжку, щоб негайно записати їх у вашу базу даних. Це є більш гнучким, ніж зберігання всіх даних у ланцюзі чи поза ланцюгом, оскільки це дозволяє застосовувати гібридний підхід, який спрощує розробку децентралізованих програм.

## Порівняння ChainSyncer та Moralis Streams

| Особливість | ChainSyncer | Moralis Streams |
| --- | --- | --- |
| Прослуховування користувацьких смарт-контрактів | ✅ | ✅ |
| Прослуховування необмеженої кількості контрактів | ✅ | ✅ |
| 100% гарантія доставки події | ✅ | ✅ (більше 💰) |
| Прослуховування гаманців | ❌ | ✅ |
| Усі можливі EVM блокчейни | ✅ | ❌ |
| Необмежена кількість спроб обробника | ✅ | ❌ |
| Прослуховувач внутрішніх транзакцій | ❌ | ✅ |


## Порівняльний огляд

Moralis Streams чудово підходить для тих, хто хоче отримати просте у використанні рішення, але він не ідеальний для тих, хто не хоче платити за дорогий бізнес-план. СhainSyncer є безкоштовним і має відкритий код, він надає спеціалізований прослуховувач смарт-контрактів, необмеженої кількості контрактів, 100% гарантію доставки подій і можливість підключення до будь-якого сумісного з EVM блокчейну. Крім того, ChainSyncer надає необмежену кількість спроб обробника, що особливо корисно у випадках, коли є велика кількість подій.
Ще одна ключова відмінність між ChainSyncer і Moralis Streams — можливість прослуховувати адреси гаманців. У той час як Moralis Streams дозволяє вам прослуховувати адреси гаманців, ChainSyncer не має цієї функції. Проте ChainSyncer сумісний з усіма можливими EVM чейнами, а це означає, що ви можете використовувати його з будь-яким сумісним з EVM блокчейном.

## Приклад використання Moralis Streams 

Ось короткий приклад використання Moralis Streams для налаштування нового потоку та моніторингу подій гаманця в мережах Ethereum та Polygon:

```typescript
import Moralis from "moralis";
import { EvmChain } from "@moralisweb3/evm-utils";
Moralis.start({
  apiKey: "YOUR_API_KEY",
});
const stream = {
  chains: [EvmChain.ETHEREUM, EvmChain.POLYGON], // list of blockchains to monitor
  description: "monitor Vasyl's wallet", // your description
  tag: "vasyl", // give it a tag
  webhookUrl: "https://YOUR_WEBHOOK_URL", // webhook url to receive events,
};
const newStream = await Moralis.Streams.add(stream);
const { id } = newStream.toJSON(); // { id: 'YOUR_STREAM_ID', ...newStream }
// Now we attach Vasyl's address to the stream
const address = "0x68b3f12d6e8d85a8d3dbbc15bba9dc5103b888a4";
await Moralis.Streams.addAddress({ address, id });
// watch the webhook (assuming you are using express)
app.post("/webhook", async (req, res) => {
  const { payload } = req.body;
  console.log(payload);
  res.sendStatus(200);
});
```

У цьому прикладі ми відстежуємо гаманець Василя, налаштовуючи новий потік за допомогою API Moralis Streams. Ми вказуємо, що хочемо відстежувати події в мережах Ethereum і Polygon. Ми також надаємо потоку тег і URL-адресу веб-хуку, за якою ми можемо отримувати події. Нарешті, ми додаємо адресу Василя до потоку та налаштовуємо вебхук для отримання подій.

## Приклад використання ChainSyncer

Тепер давайте подивимося, як ви можете використовувати ChainSyncer для моніторингу подій. Ось базовий приклад, який допоможе вам розпочати:
  
```typescript
import { ChainSyncer, InMemoryAdapter } from 'chain-syncer';
import abi from './abi.json';
const default_adapter = new InMemoryAdapter(); // change it to any other adapter
const contracts = {
  'NFTContract': {
    abi,
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    start_block: 27118825 // scanner will start from this block
  }
}
const syncer = new ChainSyncer(default_adapter, {
  
  block_time: 3500,
  network_id: 97,
  
  rpc_url: [
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545' // will be used as a fallback
  ],
  
  contractsResolver: contract_name => contracts[contract_name],
});
syncer.on('NFTContract.Transfer', async (
  { block_timestamp },
  from, 
  to, 
  token_id,
) => {
  const nft = await Nft.findOne({ id: token_id });
  if(!nft) { // postpone until nft created in our DB
    return false;
  }
  nft.owner = to;
  nft.updated_at = new Date(block_timestamp * 1000);
  await nft.save();
}));
await syncer.start();
```

За допомогою ChainSyncer ви можете відстежувати та взаємодіяти з подіями в блокчейні в режимі реального часу, дозволяючи оптимізувати процес розробки та підвищити ефективність програми.

## Висновок

Підводячи підсумок, можна сказати, що якщо ви шукаєте безкоштовний інструмент із відкритим кодом для моніторингу та взаємодії з подіями в чейні, ChainSyncer — це ваш шлях. За допомогою ChainSyncer ви навіть можете використовувати набір безкоштовних RPC для абсолютно безкоштовного індексування даних у блокчейні без жертв надійності. Це особливо корисно для невеликих/мікро проектів.

Хоча Moralis Streams має кілька чудових функцій, це може бути дорогим і централізованим сервісом. З іншого боку, ChainSyncer є відкритим вихідним кодом, безкоштовним і пропонує більшу гнучкість, надійність і децентралізацію. Вибираючи ChainSyncer, ви можете створювати інноваційні програми для співпраці, які відповідають основній філософії Web3. Важливо обирати інструменти та рішення, які підтримують децентралізацію та відкритість, оскільки ми продовжуємо будувати екосистему Web3. За допомогою ChainSyncer ви можете робити це, створюючи децентралізовані програми наступного покоління.

---

Друзі,не забуваємо донатити на  ЗСУ. Залишу  [посилання](https://aid.prytulafoundation.org/en/) для тих хто в танку.