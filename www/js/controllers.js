angular.module('app.controllers', ['app.services'])

  /**************************************************************************************************************************
  * Login handler
  ***************************************************************************************************************************/
  .controller('AppCtrl', ['$rootScope', '$ionicModal', '$state', 'mfpPromise', 'authSvc', 'jsonStoreSvc', 'loaderSvc',
    function ($rootScope, $ionicModal, $state, mfpPromise, authSvc, jsonStoreSvc, loaderSvc) {

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
          isLoggingIn: false,
          loginMessage: '',
          isChallenged: false,
          securityCheckName: AppConstants.Auth.SecurityCheckName
       };

       function resetLogin() {
          $rootScope.loginUser.password = '';
          $rootScope.loginUser.oldPassword = '';
          $rootScope.loginUser.useOldPassword = false;
          $rootScope.loginUser.isLoggingIn = false;
          $rootScope.loginUser.loginMessage = '';
          $rootScope.loginUser.isChallenged = false;
       }

       function isLoggingIn() {
          return $rootScope.loginUser.isLoggingIn;
       }

       function setAuthStatus(login) { // set authentication status
          var user = { username: $rootScope.loginUser.username };
          if (login.isLoggedIn) {
             user.isAuthenticated = login.isLoggedIn;
          }
          if (login.isOfflineLoggedIn) {
             user.isOfflineAuthenticated = login.isOfflineLoggedIn;
          }
          authSvc.setAuth(user);
       }

       function setLoginMessage(msg) {
          $rootScope.safeApply(function () {
             if (msg) {
                $rootScope.loginUser.loginMessage = msg;
                if ($rootScope.loginForm) {
                   $rootScope.loginForm.$invalid = true;
                }
             } else {
                $rootScope.loginUser.loginMessage = '';
                if ($rootScope.loginForm) {
                   $rootScope.loginForm.$invalid = false;
                }
             }
          });
       }

       $rootScope.safeApply = function (fn) {
          var phase = this.$root.$$phase;
          if (phase === '$apply' || phase === '$digest') {
             if (typeof fn === 'function') {
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
       mfpPromise.then(function () {
          var isChallenged = false;

          UserLoginChallengeHandler = WL.Client.createSecurityCheckChallengeHandler(AppConstants.Auth.SecurityCheckName);

          UserLoginChallengeHandler.isChallenged = function () {
             return isChallenged;
          };

          UserLoginChallengeHandler.setChallenge = function (state) {
             isChallenged = state;
             $rootScope.loginUser.isChallenged = state;
          };

          UserLoginChallengeHandler.handleChallenge = function (challenge) {
             WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleChallenge");

             UserLoginChallengeHandler.setChallenge(true);

             var statusMsg = "Remaining Attempts: " + challenge.remainingAttempts;
             if (challenge.errorMsg !== null) {
                statusMsg = statusMsg + ". " + challenge.errorMsg;
             }

             if (isLoggingIn()) {
                setLoginMessage(statusMsg);
             } else {
                $rootScope.login({ isChallenged: isChallenged, message: statusMsg });
             }
          };

          UserLoginChallengeHandler.handleSuccess = function () {
             WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleSuccess");

             if (isChallenged) {
                setAuthStatus({ isLoggedIn: true }); // set online login status      
                if (isLoggingIn()) {
                   $rootScope.closeLogin();
                }
             }

             UserLoginChallengeHandler.setChallenge(false);
          };

          UserLoginChallengeHandler.handleFailure = function (error) {
             WL.Logger.ctx({ pkg: 'MFP UserLoginChallengeHandler' }).debug("handleFailure: " + error.failure);

             if (isChallenged && isLoggingIn()) {
                setLoginMessage(error.failure);
             }

             UserLoginChallengeHandler.setChallenge(false);
          };
       });

       // The default page once logged in ok
       $rootScope.gotoSecuredArea = function () {
          $state.go(AppConstants.UIState.Secured);
       }

       // The home\unsecured page 
       $rootScope.gotoHomedArea = function () {
          $state.go(AppConstants.UIState.Home);
       }

       // Use offline mode as the main authentication method
       $rootScope.isAuthenticated = function () {
          return authSvc.isAuthenticated();
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
          if (UserLoginChallengeHandler.isChallenged()) {
             UserLoginChallengeHandler.cancel();
             UserLoginChallengeHandler.setChallenge(false);
          }
          $rootScope.modal.hide();
          $rootScope.loginUser.useOldPassword = false;
          $rootScope.loginUser.oldPassword = '';
          $rootScope.loginUser.password = '';
       };

       // Reset auth status when logged out
       $rootScope.logout = function (callback) {
          console.log('Doing logout', $rootScope.loginUser);

          jsonStoreSvc.disconnect(); // offline logout

          $rootScope.unregisterDevice().finally(function () { // online logout
             var loggedUser = {
                username: $rootScope.loginUser.username,
                securityCheckName: $rootScope.loginUser.securityCheckName
             };

             authSvc.logout(loggedUser);
             authSvc.clearAuth(); // reset auth state
             resetLogin(); // clear form login data

             if (typeof callback === 'function') {
                callback();
             }
          });
       };

       // Perform the login action when the user submits the login form
       $rootScope.doLogin = function (form, callback) {
          console.log('Doing login', $rootScope.loginUser);

          if (form) {
             $rootScope.loginForm = form;
          }

          // Login online first
          var loggingUser = {
             username: $rootScope.loginUser.username,
             password: $rootScope.loginUser.password,
             isChallenged: $rootScope.loginUser.isChallenged,
             securityCheckName: $rootScope.loginUser.securityCheckName,
             isOffline: $rootScope.loginUser.useOldPassword ? true : false
          };

          authSvc.login(loggingUser).then(
            // online logged in ok, do not proceed if it is still in handleChallenge()           
            function () {
               console.log('Logged in online successfully');

               if (!UserLoginChallengeHandler.isChallenged()) {
                  setAuthStatus({ isLoggedIn: true }); // set online login status   
                  $rootScope.registerDevice(); // only listen for push message if preemptive online login ok                   

                  var password = $rootScope.loginUser.useOldPassword ? $rootScope.loginUser.oldPassword : $rootScope.loginUser.password;

                  loaderSvc.show();
                  jsonStoreSvc.disconnect().then(
                    function () {
                       jsonStoreSvc.connectOnline($rootScope.loginUser.username, password).then(
                         function () {
                            loaderSvc.hide();
                            console.log('Logged in Db successfully');
                            setAuthStatus({ isOfflineLoggedIn: true });
                            $rootScope.closeLogin();
                            resetLogin();
                         },
                         function (error) { // could not logon Db offline
                            loaderSvc.hide();
                            jsonStoreSvc.disconnect();
                            if (error === AppConstants.JsonStore.FirstTimeLogin) {
                               setLoginMessage(Messages.Login.ErrFirstTimeLogin);
                            } else if (error.msg === AppConstants.JsonStore.InvalidKeyMsg
                              || error.err === AppConstants.JsonStore.InvalidKeyErr) { // JSONStore invalid key
                               $rootScope.loginUser.useOldPassword = true;
                               setLoginMessage(Messages.Login.UseOldPassword);
                            } else {
                               setLoginMessage(Messages.Login.ErrInvalidLogin);
                            }
                         }
                       );
                    });

                  if (typeof callback === 'function') {
                     callback();
                  }
               }
            },
            // online logged is failed, this could be either:
            // 1. offline mode
            // 2. online authentication failed
            function (error) {
               console.log('Failed to login online');
               setAuthStatus({ isLoggedIn: false }); // set online login status      

               // do not logon offline if the server refused the credential (returned 403 code)
               if (error.errorCode !== AppConstants.Auth.ForbiddenCode) {
                  var password = $rootScope.loginUser.useOldPassword ? $rootScope.loginUser.oldPassword : $rootScope.loginUser.password;

                  loaderSvc.show();
                  jsonStoreSvc.disconnect().then(
                    function () {
                       jsonStoreSvc.connectOffline($rootScope.loginUser.username, password).then(
                         function () {
                            loaderSvc.hide();
                            console.log('Logged in Db successfully');
                            setAuthStatus({ isOfflineLoggedIn: true });
                            $rootScope.closeLogin();
                            resetLogin();
                         },
                         function (error) {
                            loaderSvc.hide();
                            jsonStoreSvc.disconnect();
                            if (error === AppConstants.JsonStore.FirstTimeLogin) {
                               setLoginMessage(Messages.Login.ErrFirstTimeLogin);
                            } else {
                               setLoginMessage(Messages.Login.ErrInvalidLogin);
                            }
                         }
                       );
                    });

                  if (typeof callback === 'function') {
                     callback();
                  }
               } else {
                  setLoginMessage(Messages.Login.ErrInvalidLogin);
               }
            }
          );
       };
    }])

  /**************************************************************************************************************************
  * Unsecured landing page (TBD: move to another file)
  ***************************************************************************************************************************/
  .controller('HomeCtrl', ['$scope', 'dataSvc',
    function ($scope, dataSvc) {

       $scope.getUnsecuredData = function (text) { // this uses the MFP JavaAdapter example
          dataSvc.getUnsecuredData(text).then(
            function (successResponse) {
               $scope.$apply(function () {
                  $scope.hello = successResponse.responseText;
               });
            },
            function (failureResponse) {
               $scope.$apply(function () {
                  $scope.hello = JSON.stringify(failureResponse);
               });
            }
          );
       };

       $scope.getSecuredData = function () { // this uses the MFP ResourceAdapter example in PinCodeCordova
          WLAuthorizationManager.obtainAccessToken(AppConstants.Auth.AccessRestricted).then(
            function () {
               dataSvc.getSecuredData().then(
                 function (successResponse) {
                    $scope.$apply(function () {
                       $scope.hello = successResponse.responseText;
                    });
                 },
                 function (failureResponse) {
                    $scope.$apply(function () {
                       $scope.hello = JSON.stringify(failureResponse);
                    });
                 }
               );
            },
            function (error) {
               console.log("Failed to obtain access token: " + JSON.stringify(error));
            }
          );
       };

    }])

  /**************************************************************************************************************************
  * Secured landing page (TBD: move to another file)
  ***************************************************************************************************************************/
  .controller('SecuredCtrl', ['$scope',
    function ($scope) {
       $scope.hello = 'Hello from secured landing page';
    }])
