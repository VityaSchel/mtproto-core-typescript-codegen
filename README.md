# Telegram Core API (MTProto) types generator for @mtproto/core npm package

Types definitions generator for [https://mtproto-core.js.org/](https://mtproto-core.js.org/).

Made for [https://github.com/DefinitelyTyped/DefinitelyTyped/pull/63089](https://github.com/DefinitelyTyped/DefinitelyTyped/pull/63089)

## Features

- [x] Methods (params and results)
- [x] Constuctors
- [x] Interfaces
- [ ] Human-friendly description of interfaces params (TODO: scrape from <https://core.telegram.org/> docs)

## Usage

```
npm run build && npm run start
```

It downloads latest schema from [https://core.telegram.org/schema/json](https://core.telegram.org/schema/json), parses it and converts to TypeScript definitions. Then it writes result to 'mtproto__core.d.ts' file.

## License

[MIT](./LICENSE.md)

Project structure auto-generated by [Scaffold](https://github.com/VityaSchel/scaffold).