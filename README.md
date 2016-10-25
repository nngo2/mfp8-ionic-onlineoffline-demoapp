# mfp8-ionic-onlineoffline-demoapp

This is to provide an example template for building MFP v8.0 on top of Ionic framework. The sample code demonstrate online and 
offline/JSONStore scenario with a preemptive logon function, additionally a reactive login handler is also included. The application, 
built upon this template, should be working on its local JSONStore once users logged in, then invokes server side adapters when needed.

1/ Set up Ionic and Cordova and tools

npm install -g bower gulp
npm install -g ionic@1.x cordova

2/ Set up MFP tools 

npm install -g mfpdev-cli

3/ Set up project's platform and plugins: go to the project directory

bower install ngCordova --save </br>
cordova platform add android </br>
cordova plugin add cordova-plugin-mfp </br>
cordova plugin add cordova-plugin-mfp-jsonstore </br>
cordova plugin add cordova-plugin-mfp-push </br>
