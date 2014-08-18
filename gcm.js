// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global cordova */
/* global chrome */

// TODO: no-op all of these when on iOS
var platform = cordova.require('cordova/platform');

var GCM_STORAGE_PREFIX = 'gcm-';
var GCM_REGKEY = GCM_STORAGE_PREFIX + 'RegID';

var Event = require('org.chromium.common.events');
var exec = require('cordova/exec');
var _registrationId;

exports.MAX_MESSAGE_SIZE = 4096;

exports.send = function(message, callback){
  var win = function(msg) {
    callback(msg);
  };
  var fail = function(msg) {
    console.error('[chrome.gcm] Send failed:', msg);
    callback(msg);
  };
  var dest = message.destinationId;
  chrome.runtime.lastError = undefined;
  var n = JSON.stringify(message).length;
  if (n>4096) {
    throw(new Error("Payload exceeded allowed size limit. Payload size is: " + n));
  }
  exec(win, fail, 'ChromeGcm', 'send',  [dest,message]  );
};

exports.unregister = function(callback) {
  var unregok = function() {
    setRegistrationID('');
    callback();
  };
  var unregfail = function() {
    chrome.runtime.lastError = 'Unregistration Failed';
    callback();
  };
  getRegistrationID(function(regid) {
    chrome.runtime.lastError = undefined;
    if (regid) {
      exec(unregok, unregfail, 'ChromeGcm', 'unregister',[''] );
    }
  });
};

// registration should be cached in localstorage.
// If its not there, then registration is required
exports.register = function(senderid, callback) {

  var win = function(registrationId) {
    setRegistrationID(registrationId);
    callback(registrationId);
  };
  var fail = function(msg) {
    console.error('[chrome.gcm] Registration failed:', msg);
    callback(null);
  };
  chrome.runtime.lastError=undefined;
  if (senderid[0].length === 0) {
    throw(new Error("Invalid value for argument 1. Property '.0': String must be at least 1 characters long."));
  }
  getRegistrationID(function(regid) {
    if (!regid) {
      exec(win, fail, 'ChromeGcm', 'getRegistrationId',  senderid );
    } else {
      callback(regid);
    }
  });
};


exports.onMessage = new Event('onMessage');
exports.onMessagesDeleted = new Event('onMessagesDeleted');
exports.onSendError = new Event('onSendError');


function setRegistrationID(regid) {
  var regidObject ={};
  regidObject[GCM_REGKEY]=regid;
  chrome.storage.internal.set(regidObject);
  _registrationId = regid;
}

function getRegistrationID(callback) {
  if (!_registrationId) {
    chrome.storage.internal.get(GCM_REGKEY,function(items){
      if (items[GCM_REGKEY]) {
        _registrationId=items[GCM_REGKEY];
        callback(_registrationId);
      } else {
        callback(null);
      }
    });
  } else {
    callback(_registrationId);
  }
}

function fireQueuedMessages() {
  exec(undefined, undefined, 'ChromeGcm', 'fireQueuedMessages', []);
}

if (platform.id == 'android') {
  require('org.chromium.common.helpers').runAtStartUp(fireQueuedMessages);
}
