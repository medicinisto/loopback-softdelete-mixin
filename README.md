SoftDelete
=============

This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework. It allows entities of any Model to be "soft deleted" by adding a `deletedAt` attribute. Queries following the standard format will not return these entities; they can only be accessed by adding `{ deleted: true }` to the query object (at the same level as `where`, `include` etc).

This is a fork from [loopback-softdelete-mixin4](https://github.com/mendecinisto/loopback-softdelete-mixin) with added functionality to provide an indexing property option. 

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
      "index": true
    },
  ...
  "list_user_index": {
      "keys": {
        "userId": 1,
        "listId": -1,
        "deleteIndex": true
      },
      "options": {
        "unique": true 
      } 
    }
  },
```

If "index" is set to true, an additional property called `deleteIndex` will be configured and set to a random string at the time of delete. This is to provide indexing support for the following scenario.

A GroupMembership model which has a `userId` and `groupId` relation to User, and Group models with unique indexing configured to prevent duplicate relations between users and groups. Without the "index" option enabled, soft delete will break this kind of indexing and allow duplicate memberships. 

NOTE: Enabling "index" does not create the index. This must be done manually in model.json.

Retrieving deleted entities
---------------------------

To run queries that include deleted items in the response, add `{ deleted: true }` to the query object (at the same level as `where`, `include` etc).
