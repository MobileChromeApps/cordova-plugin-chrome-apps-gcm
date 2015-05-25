// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global cordova */
/* global chrome */

// TODO: no-op all of these when on iOS
var platform = cordova.require('cordova/platform');

var GCM_STORAGE_PREFIX = 'gcm-';
var GCM_REGKEY = GCM_STORAGE_PREFIX + 'RegID';
var GCM_REGKEY_SENDERS = GCM_STORAGE_PREFIX + 'RegID.S';

var Event = require('cordova-plugin-chrome-apps-common.events');
var exec = require('cordova/exec');
var channel = require('cordova/channel');
var helpers = require('cordova-plugin-chrome-apps-common.helpers');
var eventsToFireOnStartUp = [];

exports.MAX_MESSAGE_SIZE = 4096;

exports.send = function(message, callback) {
  var win = function(msgid) {
    callback(msgid);
  };
  var fail = function() {
    chrome.runtime.lastError = '[chrome.gcm] Send failed.';
    callback();
  };

  var keys = Object.keys(message);
  ['destinationId','messageId','data'].forEach(function(required_key) {
    if (keys.indexOf(required_key) == -1) {
      throw(new Error("Missing key: " + required_key));
    }
  });

  var datakeys = Object.keys(message.data).map(function(key) { return key.toLowerCase(); });
  ['goog','google','collapse_key'].forEach(function(banned_key) {
    if (datakeys.indexOf(banned_key) != -1) {
      throw(new Error("Invalid data key: " + banned_key));
    }
  });

  var n = JSON.stringify(message.data).length;
  if (n > 4096) {
    throw(new Error("Payload exceeded allowed size limit. Payload size is: " + n));
  }

  exec(win, fail, 'ChromeGcm', 'send', [message]);
};

exports.register = function(senderids, callback) {
  var win = function(registrationId) {
    setRegistrationID(registrationId, senderids);
    callback(registrationId);
  };
  var fail = function(msg) {
    chrome.runtime.lastError = '[chrome.gcm] Registration failed: ' + msg;
    callback();
  };
  if (!Array.isArray(senderids) || typeof senderids[0] !== "string" || senderids[0].length === 0) {
    throw(new Error("Invalid senderids.  Must be an array with 1 non empty string."));
  }
  getRegistrationID(function(regid) {
    if (regid) {
      return callback(regid);
    }
    exec(win, fail, 'ChromeGcm', 'getRegistrationId', senderids);
  }, senderids);
};

exports.unregister = function(callback) {
  var win = function() {
    setRegistrationID('');
    chrome.runtime.lastError = undefined;
    callback();
  };
  var fail = function(msg) {
    chrome.runtime.lastError = '[chrome.gcm] Unregistration failed:';
    callback();
  };
  getRegistrationID(function(regid) {
    if (!regid) {
      return;
    }
    exec(win, fail, 'ChromeGcm', 'unregister', []);
  });
};

function setRegistrationID(regid, senderIds) {
  var regidObject = {};
  regidObject[GCM_REGKEY] = regid;
  regidObject[GCM_REGKEY_SENDERS] = senderIds && senderIds.join();
  chrome.storage.internal.set(regidObject);
}

function getRegistrationID(callback, senderIds) {
  chrome.storage.internal.get([GCM_REGKEY, GCM_REGKEY_SENDERS], function(items) {
    if (senderIds && items[GCM_REGKEY_SENDERS] && senderIds.join() != items[GCM_REGKEY_SENDERS]) {
      // SenderIds have changed. re-register.
      callback('');
    } else {
      callback(items[GCM_REGKEY]);
    }
  });
}

exports.onMessage = new Event('onMessage');
exports.onMessagesDeleted = new Event('onMessagesDeleted');
exports.onSendError = new Event('onSendError');

function firePendingEvents() {
    var msg;
    while (msg = eventsToFireOnStartUp.shift()) {
        processMessage(msg);
    }
    eventsToFireOnStartUp = null;
}

function onMessageFromNative(msg) {
    if (eventsToFireOnStartUp) {
        eventsToFireOnStartUp.push(msg);
    } else {
        processMessage(msg);
    }
}

function processMessage(msg) {
    var action = msg.action;
    if (action == 'message') {
        exports.onMessage.fire(msg.message);
    } else if (action == 'deleted') {
        exports.onMessagesDeleted.fire();
    } else if (action == 'senderror') {
        exports.onSendError.fire(msg.error);
    } else {
        throw new Error('Unknown gcm action' + msg.action);
    }
}

if (platform.id == 'android') {
  channel.createSticky('onChromeGcmReady');
  channel.waitForInitialization('onChromeGcmReady');
  channel.onCordovaReady.subscribe(function() {
    exec(onMessageFromNative, undefined, 'ChromeGcm', 'messageChannel', []);
    helpers.runAtStartUp(function() {
        if (eventsToFireOnStartUp.length) {
            helpers.queueLifeCycleEvent(firePendingEvents);
        } else {
            eventsToFireOnStartUp = null;
        }
    });
    channel.initializationComplete('onChromeGcmReady');
  });
}
