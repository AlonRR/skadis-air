# skadis-ultralight-generator (the library)

The geometry behind the page, as a library for Node.js and browsers, built on
[Manifold](https://github.com/elalish/manifold). Not published to the npm registry.

For now it starts the geometry engine and builds a check part whose volume is known by hand;
the boards and connectors arrive with their items in [`docs/backlog.md`](../../docs/backlog.md).

```bash
npm test -w skadis-ultralight-generator        # unit tests, in Node
npm run build -w skadis-ultralight-generator   # into dist/
```
