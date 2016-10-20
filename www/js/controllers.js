angular.module('app.controllers', ['app.services'])

  /*
  * Login handler
  */
  .controller('AppCtrl', ['$rootScope', '$ionicModal', '$timeout',
    function ($rootScope, $ionicModal, $timeout) {

      // With the new view caching in Ionic, Controllers are only called
      // when they are recreated or on app start, instead of every page change.
      // To listen for when this page is active (for example, to refresh data),
      // listen for the $ionicView.enter event:
      //$scope.$on('$ionicView.enter', function(e) {
      //});

      // Form data for the login modal
      $rootScope.loginUser = {
        username: '',
        password: '',
        oldPassword: '',
        useOldPassword: false,
        isLoggedIn: false,
        isOfflineLoggedIn: false
      };

      // Create the login modal that we will use later
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $rootScope
      }).then(function (modal) {
        $rootScope.modal = modal;
      });

      // Use offline mode as the main authentication method
      $rootScope.isAuthenticated = function () {
        return $rootScope.loginUser.isOfflineLoggedIn;
      };
      
      // Open the login modal
      $rootScope.login = function (event) {
        $rootScope.$broadcast('AppConstants.Auth.ShowLoginForm', event);
      };

      $rootScope.$on('AppConstants.Auth.ShowLoginForm', function (event) {
        console.log('Doing login', event);
        $rootScope.modal.show();
      });

      // Triggered in the login modal to close it
      $rootScope.closeLogin = function () {
        $rootScope.modal.hide();
      };

      // Perform the login action when the user submits the login form
      $rootScope.doLogin = function () {
        console.log('Doing login', $rootScope.loginUser);

        // Simulate a login delay. Remove this and replace with your login
        // code if using a login system
        $timeout(function () {
          $rootScope.closeLogin();
        }, 1000);
      };
    }])

  /*
  * Unsecured landing page
  */
  .controller('HomeCtrl', ['$scope', 'DataSvc',
    function ($scope, DataSvc) {

      $scope.getUnsecuredData = function (text) { // this uses the MFP JavaAdapter example
        DataSvc.getUnsecuredData(text).then(
          function (successResponse) {
            $scope.$apply(function(){
              $scope.hello = successResponse.responseText;
            });            
          },
          function (failureResponse) {
            $scope.$apply(function(){
              $scope.hello = JSON.stringify(failureResponse);
            });            
          }
        );
      };

      $scope.getSecuredData = function () { // this uses the MFP ResourceAdapter example in PinCodeCordova
        DataSvc.getSecuredData().then(
          function (successResponse) {
            $scope.$apply(function(){
              $scope.hello = successResponse.responseText;
            });            
          },
          function (failureResponse) {
            $scope.$apply(function(){
              $scope.hello = JSON.stringify(failureResponse);
            });            
          }
        );
      };

    }])


  /*
  * Secured landing page
  */
  .controller('SecuredCtrl', ['$scope',
    function ($scope) {
      $scope.hello = 'Hello from secured landing page';
    }])
