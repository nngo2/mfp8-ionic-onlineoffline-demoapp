angular.module('app', ['ionic', 'ngCordova', 'app.controllers', 'app.services'])

	.run(function ($ionicPlatform, $rootScope, MFPPromise) {
		$ionicPlatform.ready(function () {
			// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard or form inputs)
			if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
				cordova.plugins.Keyboard.disableScroll(true);
			}

			if (window.StatusBar) { // org.apache.cordova.statusbar required				
				StatusBar.styleDefault();
			}

			MFPPromise.then(function () { WL.Logger.ctx({ pkg: 'io.ionic' }).debug('mfp and ionic are ready, safe to use WL.* APIs'); });

			$rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
				if (error === AppConstants.Auth.RequiredAuth) {
					$rootScope.login({isChallenged : false});
				}
			});
		});
	})

	.run(function ($ionicPlatform, $rootScope, MFPPromise) {
		$ionicPlatform.ready(function () {
			MFPPromise.then(function () {
				WL.App.getServerUrl(
					function(url) {
						$rootScope.serverUrl = url;
					},
					function(failureResponse) {
						 WL.Logger.ctx({ pkg: 'WL->getServerUrl' }).debug(JSON.stringify(failureResponse));
					}
				);
			});
		});
	})

	.factory('MFPPromise', function ($q) {
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
					'currentAuth': ['AuthSvc', function (AuthSvc) {
						return AuthSvc.requireAuth();
					}]
				}
			})

		$urlRouterProvider.otherwise('/app/home');
	});

/*
* Application wide contansts
*/
var AppConstants = {
	Auth: {
		RequiredAuth: 'AUTH_REQUIRED',
		ShowLoginForm: 'showLoginForm',
		SecurityCheckName: 'UserLogin'
	},
	UIState: {
		Home: 'app.home',
		Secured : 'app.secured'
	} 
}

/*
* MFP initiation code
*/
window.Messages = {
	// Add here your messages for the default language.
	// Generate a similar file with a language suffix containing the translated messages.
	// key1 : message1,
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

