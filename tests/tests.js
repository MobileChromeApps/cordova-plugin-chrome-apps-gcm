// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var senderid = '90031296475';
var sender = senderid+ "@gcm.googleapis.com";
var containerElement;
var numIds = 0;

function createMessage(type) {
  if (!type) {
    type = 'ping';
  }
  var messageId = 'id' + numIds.toString();
  numIds++;

  var message = {
    'destinationId' : sender,
    'messageId' : messageId,
    'timeToLive' : 10,
    'data' : { 'type': type, 'message' : 'test' }
  };

  return message;
}

function getTimestamp() {
  return Date.now();
}

// As this file is run at app startup, wait for deviceready before
// using any plugin APIs
document.addEventListener("deviceready", function() {

  chrome.gcm.onMessage.addListener(function(message) {
    console.log('onMessage fired (' + getTimestamp() + '). message = \n' + JSON.stringify(message, null, 4));
  });

  chrome.gcm.onMessagesDeleted.addListener(function(notificationId, byUser) {
    console.log('onMessagesDeleted fired (' + getTimestamp() + ')');
  });

  chrome.gcm.onSendError.addListener(function(error) {
    console.log('onSendError fired (' + getTimestamp() + '). error = \n' + JSON.stringify(error, null, 4));
  });
});

exports.defineManualTests = function(rootEl, addButton) {

  containerElement = rootEl;

  addButton('Send message with delayed response', function() {
    var message = createMessage('delay');
    try {
      chrome.gcm.send(message, function(msgid) {
        logger('Delay message "' + msgid + '" sent (' + getTimestamp() + ')');
      });
    } catch (e) {
      logger('Exception sending delay message: ' + e);
    }
  });

};

exports.defineAutoTests = function() {
  'use strict';

  require('cordova-plugin-chrome-apps-test-framework.jasmine_helpers').addJasmineHelpers();

  var senderid = '90031296475';
  var sender = senderid+ "@gcm.googleapis.com";
  var messageCounter = 0;

  function getMessageId() {
    return (++messageCounter).toString();
  }

  describeExcludeIos('registration', function() {
    it('should contain definitions', function(done) {
      expect(chrome.gcm).toBeDefined();
      expect(chrome.gcm.send).toBeDefined();
      expect(chrome.gcm.register).toBeDefined();
      expect(chrome.gcm.unregister).toBeDefined();
      expect(chrome.gcm.onMessage).toBeDefined();
      expect(chrome.gcm.onSendError).toBeDefined();
      expect(chrome.gcm.onMessagesDeleted).toBeDefined();
      done();
    });

    it('should register and unregister', function(done) {
      chrome.gcm.register([senderid], function(regid) {
        expect(regid).toBeDefined();
        expect(regid.length).toBeGreaterThan(1);
        expect(chrome.runtime.lastError).toBeFalsy();
        chrome.gcm.unregister(function() {
          expect(chrome.runtime.lastError).not.toBeDefined();
          done();
        });
      });
    });

    it('should fail to register with a blank sender', function(done) {
      try {
        chrome.gcm.register([''], function(regid) {
          expect('Not to get here').toEqual('');
        });
      } catch(e) {
        expect(e.message).toBeDefined();
        expect(chrome.runtime.lastError).not.toBeDefined();
      }
      done();
    });

    it('should re-register', function(done) {
      chrome.gcm.register([senderid], function(regid) {
        expect(regid.length).toBeGreaterThan(1);
        expect(chrome.runtime.lastError).not.toBeDefined();
        done();
      });
    });

  });

  describeExcludeIos('sending', function() {
    it('should error for missing key', function(done) {
      var message = {
        'data' : { 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect("Should not be here").not.toBeDefined();
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        done();
      }
    });

    it('should error for invalid data', function(done) {
      var message = {
        'messageId' : getMessageId(),
        'destinationId' : sender,
        'timeToLive' : 0,
        'data' : { 'collapse_key': '1', 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect("Should not be here").not.toBeDefined();
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        done();
      }
    });

    it('should fail to send a big msg', function(done) {
      var blob100 = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
      var msgdata = {};
      for(var k = 0; k < 41; k++){
        var key = 'k' + k;
        msgdata[key] = blob100;
      }
      var message = {
        'destinationId' : sender,
        'messageId' : getMessageId(),
        'timeToLive' : 10,
        'data' : msgdata
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect('Should not get here').toBe(false);
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        //expect(e.message.substring(0,16)).toEqual("Payload exceeded");
        done();
      }
    });

    it('should send and receive one simple msg', function(done) {
      var message = {
        'destinationId' : sender,
        'messageId' : getMessageId(),
        'timeToLive' : 10,
        'data' : { 'type': 'ping', 'message' : 'test' }
      };
      chrome.gcm.onMessage.addListener(function listener(msg) {
        expect(msg).toBeDefined();
        expect(msg.data).toBeDefined();
        expect(msg.data.type).toEqual('pong');
        expect(msg.data.message).toEqual('test');

        chrome.gcm.onMessage.removeListener(listener);
        done();
      });
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid).toBeDefined();
          expect(msgid.length).toBeGreaterThan(0);
          expect(chrome.runtime.lastError).not.toBeDefined();
        });
      } catch (e) {
          expect(e).not.toBeDefined();
      }
    });

    it('should send and receive one complex msg', function(done) {
      var message = {
        'destinationId' : sender,
        'messageId' : getMessageId(),
        'timeToLive' : 10,
        'data' : {
          'type': 'ping',
          'message' : 'testing multi value',
          'message2': 'more2',
          'message3': 'more3',
          'message4': 'more4',
          'message5': 'more5',
          //'int': 1,
          //'float': 3.33,
          //'bool': true,
          //'string': 'sss',
          //'array': [1, 3.33, true, 'sss', [1,2,3], {'a':1, 'b':2}],
          //'map': {'a': 1, 'b': 2}
        }
      };
      chrome.gcm.onMessage.addListener(function listener(msg) {
        expect(msg).toBeDefined();
        expect(msg.data).toBeDefined();
        expect(msg.data.type).toEqual('pong');
        expect(msg.data.message).toEqual(message.data.message);

        chrome.gcm.onMessage.removeListener(listener);
        done();
      });
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid).toBeDefined();
          expect(msgid.length).toBeGreaterThan(0);
          expect(chrome.runtime.lastError).not.toBeDefined();
        });
      } catch (e) {
          expect(e).not.toBeDefined();
      }
    });

    // I would love to test onSendError and onMessagesDeleted

  });
};
