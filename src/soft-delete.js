var crypto = require('crypto');

import _debug from './debug';
const debug = _debug();

export default (Model, { deletedAt = 'deletedAt', scrub = false , index = false, deletedById = false, deleteOp = false}) => {
  debug('SoftDelete mixin for Model %s', Model.modelName);

  debug('options', { deletedAt, scrub, index });

  const properties = Model.definition.properties;
  const idName = Model.dataSource.idName(Model.modelName);

  let scrubbed = {};
  if (scrub !== false) {
    let propertiesToScrub = scrub;
    if (!Array.isArray(propertiesToScrub)) {
      propertiesToScrub = Object.keys(properties)
        .filter(prop => !properties[prop][idName] && prop !== deletedAt);
    }
    scrubbed = propertiesToScrub.reduce((obj, prop) => ({ ...obj, [prop]: null }), {});
  }

  Model.defineProperty(deletedAt, {type: Date, required: false, default: null});
  if (index) Model.defineProperty('deleteIndex', { type: String, required: true, default: 'null' });
  if (deletedById) Model.defineProperty('deletedById', { type: Number, required: false, default: null });
  if (deleteOp) Model.defineProperty('deleteOp', { type: String, required: false, default: null });

  Model.destroyAll = function softDestroyAll(where, cb) {
    var deletePromise = index ? Model.updateAll(where, { ...scrubbed, [deletedAt]: new Date(), deleteIndex: genKey() }) :
      Model.updateAll(where, { ...scrubbed, [deletedAt]: new Date() })
    
    return deletePromise
      .then(result => (typeof cb === 'function') ? cb(null, result) : result)
      .catch(error => (typeof cb === 'function') ? cb(error) : Promise.reject(error));
  };

  Model.remove = Model.destroyAll;
  Model.deleteAll = Model.destroyAll;

  Model.destroyById = function softDestroyById(id, cb) {
    var deletePromise = index ? Model.updateAll({ [idName]: id }, { ...scrubbed, [deletedAt]: new Date(), deleteIndex: genKey() }) :
      Model.updateAll({ [idName]: id }, { ...scrubbed, [deletedAt]: new Date() });

    return deletePromise
      .then(result => (typeof cb === 'function') ? cb(null, result) : result)
      .catch(error => (typeof cb === 'function') ? cb(error) : Promise.reject(error));
  };

  Model.removeById = Model.destroyById;
  Model.deleteById = Model.destroyById;

  Model.prototype.destroy = function softDestroy(options, cb) {
    const callback = (cb === undefined && typeof options === 'function') ? options : cb;
    let data = {
      ...scrubbed, 
      [deletedAt]: new Date()
    };
    options = options || {};
    options.delete = true;
    if (index) data.deleteIndex = genKey();
    if (deletedById && options.deletedById) data.deletedById = options.deletedById;
    if (deleteOp && options.deleteOp) data.deleteOp = options.deleteOp;
    
    return this.updateAttributes(data, options)
      .then(result => (typeof cb === 'function') ? callback(null, result) : result)
      .catch(error => (typeof cb === 'function') ? callback(error) : Promise.reject(error));
  };

  Model.prototype.remove = Model.prototype.destroy;
  Model.prototype.delete = Model.prototype.destroy;

  // Emulate default scope but with more flexibility.
  const queryNonDeleted = {[deletedAt]: null};

  const _findOrCreate = Model.findOrCreate;
  Model.findOrCreate = function findOrCreateDeleted(query = {}, ...rest) {
    if (!query.deleted) {
      if (!query.where || Object.keys(query.where).length === 0) {
        query.where = queryNonDeleted;
      } else {
        query.where = { and: [ query.where, queryNonDeleted ] };
      }
    }

    return _findOrCreate.call(Model, query, ...rest);
  };

  const _find = Model.find;
  Model.find = function findDeleted(query = {}, ...rest) {
    if (!query.deleted) {
      if (!query.where || Object.keys(query.where).length === 0) {
        query.where = queryNonDeleted;
      } else {
        query.where = { and: [ query.where, queryNonDeleted ] };
      }
    }

    return _find.call(Model, query, ...rest);
  };

  const _count = Model.count;
  Model.count = function countDeleted(where = {}, ...rest) {
    // Because count only receives a 'where', there's nowhere to ask for the deleted entities.
    let whereNotDeleted;
    if (!where || Object.keys(where).length === 0) {
      whereNotDeleted = queryNonDeleted;
    } else {
      whereNotDeleted = { and: [ where, queryNonDeleted ] };
    }
    return _count.call(Model, whereNotDeleted, ...rest);
  };

  const _update = Model.update;
  Model.update = Model.updateAll = function updateDeleted(where = {}, ...rest) {
    // Because update/updateAll only receives a 'where', there's nowhere to ask for the deleted entities.
    let whereNotDeleted;
    if (!where || Object.keys(where).length === 0) {
      whereNotDeleted = queryNonDeleted;
    } else {
      whereNotDeleted = { and: [ where, queryNonDeleted ] };
    }
    return _update.call(Model, whereNotDeleted, ...rest);
  };

  if (Model.settings.remoting && Model.settings.remoting.sharedMethods.deleteById !== false && (deletedById || deleteOp)) {
    Model.disableRemoteMethodByName('deleteById');

    Model.remoteMethod('deleteById', {
      accessType: 'WRITE',
      isStatic: false,
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' }
      ],
      returns: {arg: 'data', type: 'object', root: true},
      http: {verb: 'delete', path: '/'},
    });

    Model.prototype.deleteById = function(options = {}) {
      if (deletedById) options.deletedById = options.accessToken ? options.accessToken.userId : null;
      if (deleteOp && options.deletedById) options.deleteOp = 'user';
      return this.destroy(options).then(function() {
        return { count: 1 }
      })
    };
  }
};

var genKey = function() {
  return crypto.createHmac('sha256', Math.random().toString(12).substr(2)).digest('hex').substr(0, 8);
};
