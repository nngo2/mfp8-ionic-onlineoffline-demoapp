angular.module('app', ['ionic', 'ngCordova', 'app.controllers', 'app.services'])

	.run(function ($ionicPlatform, $rootScope, mfpPromise) {
	   $ionicPlatform.ready(function () {
	      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard or form inputs)
	      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
	         cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
	         cordova.plugins.Keyboard.disableScroll(true);
	      }

	      if (window.StatusBar) { // org.apache.cordova.statusbar required				
	         StatusBar.styleDefault();
	      }

	      mfpPromise.then(function () { WL.Logger.ctx({ pkg: 'io.ionic' }).debug('mfp and ionic are ready, safe to use WL.* APIs'); });

	      $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
	         if (error === AppConstants.Auth.RequiredAuth) {
	            $rootScope.login({ isChallenged: false });
	         }
	      });
	   });
	})

	.run(function ($q, $ionicPlatform, $rootScope, $cordovaDialogs, mfpPromise) {
	   $ionicPlatform.ready(function () {
	      mfpPromise.then(function () {
	         $rootScope.pushRegistered = false; // in case we could not unregister, do register again

	         WL.App.getServerUrl(
					function (url) {
					   $rootScope.serverUrl = url;
					},
					function (failureResponse) {
					   console.log(JSON.stringify(failureResponse));
					}
				);

	         $rootScope.notificationReceived = function (msg) { // handle default alert message
	            if (msg && msg.alert) {
	               $cordovaDialogs.alert(msg.alert, 'Received notification', 'OK');
	            } else {
	               console.log(JSON.stringify(msg));
	            }
	         };

	         $rootScope.registerDevice = function registerDevice() {
	            if ($rootScope.pushInitialized && !$rootScope.pushRegistered) {
	               WLAuthorizationManager.obtainAccessToken(AppConstants.Push.Scope).then(
							function () {
							   MFPPush.registerDevice(
                            null,
                            function (successResponse) {
                               console.log("MFP Push: Successfully registered device: " + successResponse);
                               $rootScope.pushRegistered = true;
                            },
                            function (failureResponse) {
                               console.log("MFP Push: Failed to register device:" + JSON.stringify(failureResponse));
                            }
                        );
							}
						);
	            }
	         };

	         $rootScope.unregisterDevice = function unregisterDevice() {
	            var defer = $q.defer();
	            if ($rootScope.pushRegistered) {
	               $rootScope.pushRegistered = false; // need not to wait for the callback which sometimes losted		
	               WLAuthorizationManager.obtainAccessToken(AppConstants.Push.Scope)
						.then(function () {
						   MFPPush.unregisterDevice(
                         function (successResponse) {
                            console.log("MFP Push: Successfully unregistered device: " + successResponse);
                            defer.resolve(successResponse);
                         },
                         function (failureResponse) {
                            console.log("MFP Push: Failed to unregister device:" + JSON.stringify(failureResponse));
                            defer.reject(failureResponse);
                         }
                     );
						}
						)
						.fail(function (failureResponse) {
						   defer.reject(failureResponse);
						});
	            }
	            return defer.promise;
	         };

	         MFPPush.initialize(
					function (successResponse) {
					   console.log("MFP Push: Successfully intialized: " + successResponse);
					   MFPPush.isPushSupported(
							function (successResponse) {
							   console.log("MFP Push is supported: " + successResponse);
							   $rootScope.pushInitialized = true;
							   MFPPush.registerNotificationsCallback($rootScope.notificationReceived);
							},
							function (failureResponse) {
							   console.log("MFP Push is unsupported : " + JSON.stringify(failureResponse));
							}
						);
					},
					function (failureResponse) {
					   console.log("MFP Push: Failed to initialize: " + failureResponse);
					});
	      });
	   });
	})

	.factory('mfpPromise', function () {
	   return window.MFPDefer.promise;
	})

	.config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
	   $ionicConfigProvider.backButton.previousTitleText(false);
	   $ionicConfigProvider.views.transition('platform');
	   $ionicConfigProvider.navBar.alignTitle('center');

	   // Ionic uses AngularUI Router which uses the concept of states
	   // Learn more here: https://github.com/angular-ui/ui-router
	   // Set up the various states which the app can be in.
	   // Each state's controller can be found in controllers.js
	   $stateProvider
          .state('app', {
             url: '/app',
             abstract: true,
             templateUrl: 'templates/menu.html',
             controller: 'AppCtrl'
          })
          .state(AppConstants.UIState.Home, {
             url: '/home',
             cache: false,
             views: {
                'menuContent': {
                   templateUrl: 'templates/home.html',
                   controller: 'HomeCtrl'
                }
             }
          })
          .state(AppConstants.UIState.Secured, {
             url: '/secured',
             cache: false,
             views: {
                'menuContent': {
                   templateUrl: 'templates/secured.html',
                   controller: 'SecuredCtrl'
                }
             },
             resolve: {
                'currentAuth': ['authSvc', function (authSvc) {
                   return authSvc.requireAuth();
                }
                ]
             }
          });

	   $urlRouterProvider.otherwise('/app/home');
	});

/*
* Application wide contansts
*/
var AppConstants = {
   Auth: {
      RequiredAuth: 'AUTH_REQUIRED',
      ShowLoginForm: 'showLoginForm',
      SecurityCheckName: 'UserLogin',
      ForbiddenCode: 403,
      AccessRestricted: 'accessRestricted'
   },
   UIState: {
      Home: 'app.home',
      Secured: 'app.secured'
   },
   JsonStore: {
      UserCredentials: 'userCredentials',
      FirstTimeLogin: 'firstTimeLogin',
      InvalidLogin: 'invalidLogin',
      InvalidKeyMsg: 'INVALID_KEY_ON_PROVISION',
      InvalidKeyErr: -3
   },
   Push: {
      Scope: 'push.mobileclient'
   }
}

/*
* MFP initiation code
*/
window.Messages = {
   // Add here your messages for the default language.
   // Generate a similar file with a language suffix containing the translated messages.
   Login: {
      UseOldPassword: 'Could not logon Db with the online\\current password.\n Use the last password to logon. \n',
      ErrFirstTimeLogin: 'This is the first time login, must be online.',
      ErrInvalidLogin: 'Invalid login'
   }
};

window.wlInitOptions = {
   // Options to initialize with the WL.Client object.
   // For initialization options please refer to IBM MobileFirst Platform Foundation Knowledge Center.
};

window.MFPDefer = angular.injector(['ng']).get('$q').defer();;
window.wlCommonInit = window.MFPDefer.resolve;
window.MFPDefer.promise.then(function wlCommonInit() {
   WL.Logger.ctx({ pkg: 'MFP wlCommonInit' }).debug('MobileFirst Client SDK Initilized');
});

