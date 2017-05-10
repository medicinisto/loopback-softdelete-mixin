SoftDelete
=============

This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework. It allows entities of any Model to be "soft deleted" by adding `deletedAt` (Date) and `deleted` boolean attributes. Queries following the standard format will not return these entities; they can only be accessed by adding `{ deleted: true }` to the query object (at the same level as `where`, `include` etc).

This is a fork from [loopback-softdelete-mixin4](https://github.com/mendecinisto/loopback-softdelete-mixin), to which the `deleted` boolean property is added to allow for better indexing against non deleted records.

Install
-------

```bash
  npm install --save loopback-softdelete-mixin4
```

SERVER CONFIG
------------

Add the `mixins` property to your `server/model-config.json`:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/loopback-softdelete-mixin4",
      "../common/mixins"
    ]
  }
}
```

MODEL CONFIG
------------

To use with your Models add the `mixins` attribute to the definition object of your model config.

```json
  {
    "name": "Widget",
    "properties": {
      "name": {
        "type": "string",
      },
    },
    "mixins": {
      "SoftDelete" : true,
    },
  },
```

There are a number of configurable options to the mixin. You can specify an alternative property name for `deletedAt`, as well as configuring deletion to "scrub" the entity. If true, this sets all but the "id" fields to null. If an array, it will only scrub properties with those names.

```json
  "mixins": {
    "SoftDelete": {
      "deletedAt": "deleted_at",
      "scrub": true,
    },
  },
```

Retrieving deleted entities
---------------------------

To run queries that include deleted items in the response, add `{ deleted: true }` to the query object (at the same level as `where`, `include` etc).
