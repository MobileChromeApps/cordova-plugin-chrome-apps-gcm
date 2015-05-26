# Chrome Google Cloud Messaging V2 Plugin

This plugin allows Android apps to send/receive push messages.

## Status

Supported on Android

## Reference

The API reference is [here](https://developer.chrome.com/apps/gcm), and a full description on how to set up Google Cloud Messaging is [here](https://developer.chrome.com/apps/cloudMessaging).

## Dependencies

* chrome.storage

## Notes

* Currently only a single registration is permitted per application, and a registration can only be for a single sender id
* The sender ID and registration is cached in local storage
* You require the 'gcm' permission to use this API

# Release Notes

## 1.2.1 (May 26, 2015)
- Don't cache registration ID when `SENDER_ID` changes

## 1.2.0 (April 30, 2015)
- Renamed plugin to pubilsh to NPM
- Now using cordova-background-app@2.0.0 for better background processing

## 1.1.1 (Mar 17, 2015)
* Remove version constraint on backgroundapp dependency due to plugman bug CB-8696

## 1.1.0 (Mar 17, 2015)
* Use BackgroundApp plugin to handle background events
* Make chrome.gcm Java 1.6 compatible
* Refactor to use messageQueue for native -> JS events (CSP compliant)
* Fix race conditions causing onLaunched not to fire

## 1.0.3 (Jan 27, 2015)
* Split Android permissions within plugin.xml into separate tags (fixes #494)
* Add custom permission so that other apps can't snoop our messages
* Don't require `GET_ACCOUNTS` permission in newer Android versions
* Don't include `INTERNET` permission in chrome.gcm plugin since it doesn't uninstall correctly (fixes #488)

## 1.0.2 (October 21, 2014)
- Correct apparent copy/paste bug.
- Documentation updates.

## 1.0.1 (September 24, 2014)
- Fix #287 #290 Fix several significant GCM bugs

## 1.0.0 (May 8, 2014)
- Initial Release
