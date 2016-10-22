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
          that.show(text || 'Loading...');
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

      function isAuthenticated() {
        return credential.isOfflineAuthenticated;
      } 

      function doRequireAuth() {
        var defer = $q.defer();
        if (!isAuthenticated()) {
          defer.reject(AppConstants.Auth.RequiredAuth);
        } else {
          defer.resolve();
        }
        return defer.promise;
      }

      function doLogout(login) {
        return WLAuthorizationManager.logout(login.securityCheckName).then(
          function () {
            WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("logout onSuccess");
          },
          function (response) {
            WL.Logger.ctx({ pkg: 'MFP WLAuthorizationManager' }).debug("logout onFailure: " + JSON.stringify(response));
          });
      }

      function doLogin(login) {
        var defer = $q.defer();

        if (login.isOffline) { // do not authenticate with the server when client is in offline mode
          defer.reject({errorCode : ''});
        } else {
          if (login.isChallenged) {
            UserLoginChallengeHandler.submitChallengeAnswer({ 'username': login.username, 'password': login.password });
            defer.resolve();
          } else {
            WLAuthorizationManager.login(login.securityCheckName, 
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
        }
        
        return defer.promise;
      }

      var AuthApi = {
        setAuth: function(user) {
          if (user.username) {
            credential.username = user.username;
          }
          if (user.isAuthenticated){
            credential.isAuthenticated = user.isAuthenticated
          }
          if (user.isOfflineAuthenticated){
            credential.isOfflineAuthenticated = user.isOfflineAuthenticated
          }          
        },
        clearAuth: function() {
          credential.username = '';
          credential.isAuthenticated = false;
          credential.isOfflineAuthenticated = false;
        },
        requireAuth: function() {
          return doRequireAuth();
        },
        isOfflineAuth: function() {
          return credential.isOfflineAuthenticated;
        },
        isAuth: function() {
          return credential.isAuthenticated;
        },
        isAuthenticated: function() {
          return isAuthenticated();
        }, 
        login: function(login) {
          return doLogin(login);
        },
        logout: function(login) {
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

  .factory('JsonStoreSvc', ['$q',
    function ($q) {
      // collection to check the first time logon
      var credCollectionName = AppConstants.JsonStore.UserCredentials;
      var collections = {
        userCredentials : {
          searchFields : {
            collectionNotEmpty: 'string'
          }
        }
      };

      var JsonStoreApi = {
        connectOnline: function(username, password) {
          return WL.JSONStore.init(collections, {password:password, username:username, localKeyGen:true})
            .then(function() {   		
              return WL.JSONStore.get(credCollectionName).count();
            })	
            .then(function(countResult) {
              if (countResult == 0) { // The JSONStore collection is empty, populate it.                
                var data = [{collectionNotEmpty:"true"}];
                return WL.JSONStore.get(credCollectionName).add(data);
              }
            });
        },
        connectOffline: function(username, password){
          var defer = $q.defer();
          WL.JSONStore.init(collections, {password:password, username:username, localKeyGen:true})	
		    	.then(function() {
		    		WL.JSONStore.get(credCollectionName).count()
		    		.then(function(countResult) {
		    			if (countResult == 0) {
		    				WL.JSONStore.destroy(username);
                console.log('Destroyed JSONStore, require online mode');
                defer.reject(AppConstants.JsonStore.FirstTimeLogin);
					    } else {
                defer.resolve();
					    }
		    		})
		    	})
		    	.fail(function(error) {
            console.log('Failed to logon Db: ' +  JSON.stringify(error));
            defer.reject(AppConstants.JsonStore.InvalidLogin);
		    	})
          return defer.promise;
        },
        disconnect: function() {
          return WL.JSONStore.closeAll();
        }
      };

      return JsonStoreApi;
    }
  ])