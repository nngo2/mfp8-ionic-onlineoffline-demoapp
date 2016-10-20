angular.module('app.controllers', ['app.services'])

  /**************************************************************************************************************************
  * Login handler
  ***************************************************************************************************************************/
  .controller('AppCtrl', ['$rootScope', '$ionicModal', '$state', 'MFPPromise', 'AuthSvc',
    function ($rootScope, $ionicModal, $state, MFPPromise, AuthSvc) {

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
        isOfflineLoggedIn: false,
        isLoggingIn: false,
        loginMessage: '',
        isChallenged: false
      };

      function resetLogin() {
        $rootScope.loginUser.password = '';
        $rootScope.loginUser.oldPassword = '';
        $rootScope.loginUser.useOldPassword = false;
        $rootScope.loginUser.isLoggedIn = false;
        $rootScope.loginUser.isLoggingIn = false;
        $rootScope.loginUser.isOfflineLoggedIn = false;
        $rootScope.loginUser.loginMessage = '';
        $rootScope.loginUser.isChallenged = false;
      }

      function isLoggingIn() {
        return  $rootScope.loginUser.isLoggingIn;
      }

      function setAuthStatus(login) { // set authentication status
        var user = { username: $rootScope.loginUser.username };
        if (login.isLoggedIn) {
          user.isAuthenticated = login.isLoggedIn;
        }
        if (login.isOfflineLoggedIn) {
          user.isOfflineAuthenticated = login.isOfflineLoggedIn;
        }
        AuthSvc.setAuth(user);      
      }

      function setLoginMessage(msg) {
        $rootScope.safeApply(function(){
          if (msg) {
            $rootScope.loginUser.loginMessage = msg;
          } else {
            $rootScope.loginUser.loginMessage = '';
          }
        });
      }

      $rootScope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
          if(fn && (typeof(fn) === 'function')) {
            fn();
          }
        } else {
          this.$apply(fn);
        }
      };

      // Create the login modal that we will use later
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $rootScope
      }).then(function (modal) {
        $rootScope.modal = modal;
      });

      ////////////////////////////////////////////////////////////////////////////////////////// 
      // Reactive authetication handler, called when accessing WL resources while not logging on
      //////////////////////////////////////////////////////////////////////////////////////////
      MFPPromise.then(function() {
        var isChallenged = false;
        var securityCheckName = AppConstants.Auth.SecurityCheckName;
        
        // Define a static challenge handler
        UserLoginChallengeHandler = WL.Client.createSecurityCheckChallengeHandler(securityCheckName);

        UserLoginChallengeHandler.securityCheckName = securityCheckName;

        UserLoginChallengeHandler.isChallenged = function(){
          return isChallenged;
        };

        UserLoginChallengeHandler.setChallenge = function(state) {
          isChallenged = state;
        };

        UserLoginChallengeHandler.handleChallenge = function(challenge) {
            WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleChallenge");
            UserLoginChallengeHandler.setChallenge(true); 

            var statusMsg = "Remaining Attempts: " + challenge.remainingAttempts;
            if (challenge.errorMsg !== null){
                statusMsg = statusMsg + "<br/>" + challenge.errorMsg;
            }

            $rootScope.login({isChallenged : isChallenged, message : statusMsg});
        };

        UserLoginChallengeHandler.handleSuccess = function(data) {
            WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleSuccess");
            if (isChallenged) {
              setAuthStatus({isLoggedIn : true}); // set online login status              
              if (isLoggingIn()) {
                $rootScope.closeLogin();
              }              
            }
            UserLoginChallengeHandler.setChallenge(false); 
        };

        UserLoginChallengeHandler.handleFailure = function(error) {
            WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleFailure: " + error.failure);
            if (isChallenged && isLoggingIn()) {
              setLoginMessage(error.failure);
            }
            UserLoginChallengeHandler.setChallenge(false); 
        };
      });

      // The default page once logged on ok
      $rootScope.gotoSecuredArea = function() {
        $state.go(AppConstants.UIState.Secured);
      }

      // Use offline mode as the main authentication method
      $rootScope.isAuthenticated = function () {
        return AuthSvc.isAuth();
      };
      
      // Open the login modal
      $rootScope.login = function (event) {
        $rootScope.$broadcast('AppConstants.Auth.ShowLoginForm', event);
      };

      $rootScope.$on('AppConstants.Auth.ShowLoginForm', function (event, eventData) {
        console.log('Doing login', eventData);
        $rootScope.modal.show();           
        $rootScope.loginUser.isLoggingIn = true;
        $rootScope.loginUser.isChallenged = eventData.isChallenged;
        setLoginMessage(eventData.message);     
      });

      // Triggered in the login modal to close it
      $rootScope.closeLogin = function () {
        $rootScope.modal.hide();
        resetLogin();
      };

      // Reset auth status when logged out
      $rootScope.logout = function () {
        AuthSvc.clearAuth();
      };

      // Perform the login action when the user submits the login form
      $rootScope.doLogin = function (form, callback) {
        console.log('Doing login', $rootScope.loginUser);

        // Login online first
        var loggingUser = {
          username: $rootScope.loginUser.username,
          password: $rootScope.loginUser.password,
          isChallenged: $rootScope.loginUser.isChallenged
        };  

        AuthSvc.login(loggingUser).then(
          function(){ // online logged in ok, do not process the login initiated by challenge handler 
            if (!UserLoginChallengeHandler.isChallenged()) { 
              console.log('Logged in online successfully');            
              setAuthStatus({isLoggedIn : true}); // set online login status      
              $rootScope.closeLogin();             
              
              // always do offline logon
              
              if (typeof callback === 'function') {
                callback();  
              }
            }
          },
          function(error){ //online logged in failed
            console.log('Failed to login online');

            // always do offline logon
          }
        ); 
      };
    }])

  /**************************************************************************************************************************
  * Unsecured landing page
  ***************************************************************************************************************************/
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


  /**************************************************************************************************************************
  * Secured landing page
  ***************************************************************************************************************************/
  .controller('SecuredCtrl', ['$scope',
    function ($scope) {
      $scope.hello = 'Hello from secured landing page';
    }])
