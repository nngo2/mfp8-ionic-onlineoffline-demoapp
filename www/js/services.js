angular.module('app.services', [])
  .factory('LoaderSvc', ['$ionicLoading', '$timeout',
    function ($ionicLoading, $timeout) {
      return {
        show: function (text) {
          console.log('show loading', text);
          $ionicLoading.show({
            content: (text || 'Loading...'),
            noBackdrop: true
          });
        },
        hide: function () {
          console.log('hide loading');
          $ionicLoading.hide();
        },
        toggle: function (text, timeout) {
          var that = this;
          that.show(text);
          $timeout(function () {
            that.hide();
          }, timeout || 3000);
        }
      };
    }
  ])

  .factory('AuthSvc', ['$q',
    function ($q) {
      var credential = {
        username: '',
        isAuthenticated: false,
        isOfflineAuthenticated: false
      };

      function doRequireAuth(login) {
        var defer = $q.defer();
        if (!credential.isAuthenticated) {
          defer.reject(AppConstants.Auth.RequiredAuth);
        } else {
          defer.resolve();
        }
        return defer.promise;
      }

      function doLogout() {
        return WLAuthorizationManager.logout(UserLoginChallengeHandler.SecurityCheckName).then(
          function () {
            WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("logout onSuccess");
          },
          function (response) {
            WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("logout onFailure: " + JSON.stringify(response));
          });
      }

      function doLogin(login) {
        var defer = $q.defer();
        if (login.isChallenged) {
          UserLoginChallengeHandler.submitChallengeAnswer({ 'username': login.username, 'password': login.password });
          defer.resolve();
        } else {
          WLAuthorizationManager.login(UserLoginChallengeHandler.SecurityCheckName, 
            { 'username': login.username, 'password': login.password }).then(
            function () {
              WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("login onSuccess");
              defer.resolve();
            },
            function (response) {
              WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("login onFailure: " + JSON.stringify(response));
              defer.reject(response);
            });
        }
        return defer.promise;
      }

      var AuthApi = {
        currentAuth: credential,
        setAuth: function (user) {
          angular.copy(user, credential);
        },
        clearAuth: function () {
          credential.username = '';
          credential.isAuthenticated = false;
          credential.isOfflineAuthenticated = false;
        },
        requireAuth: function () {
          return doRequireAuth();
        },
        isOfflineAuth: function () {
          return credential.isOfflineAuthenticated;
        },
        isAuth: function () {
          return credential.isAuthenticated;
        },
        login: function (login) {
          return doLogin(login);
        },
        logout: function () {
          return doLogout(login);
        }        
      };

      return AuthApi;
    }
  ])

  .factory('DataSvc', ['$q',
    function ($q) {

      var DataApi = {
        getUnsecuredData: function (name) {
          var resourceRequest = new WLResourceRequest("/adapters/javaAdapter/resource/greet", WLResourceRequest.GET);
          resourceRequest.setQueryParameter("name", name);
          return resourceRequest.send();
        },
        getSecuredData: function () {
          var resourceRequest = new WLResourceRequest("/adapters/ResourceAdapter/balance", WLResourceRequest.GET);
          return resourceRequest.send();
        }
      };

      return DataApi;
    }
  ])