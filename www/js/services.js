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
        isAuthenticated: false
      };
      
      var AuthApi = {
        clearAuth: function () {
          credential.username = '';
          credential.isAuthenticated = false;
        },
        requireAuth: function () {
          var defer = $q.defer();
          if (!credential.isAuthenticated) {
            defer.reject(AppConstants.Auth.RequiredAuth);
          } else {
            defer.resolve();
          }
          return defer.promise;
        }
      };

      return AuthApi;
    }
  ])

 .factory('DataSvc', ['$q',
    function ($q) {

      var DataApi = {
        getUnsecuredData: function(name) {
          var resourceRequest = new WLResourceRequest("/adapters/javaAdapter/resource/greet", WLResourceRequest.GET);
          resourceRequest.setQueryParameter("name", name);
          return resourceRequest.send();
        },
        getSecuredData: function() {
          var resourceRequest = new WLResourceRequest("/adapters/ResourceAdapter/balance", WLResourceRequest.GET);
          return resourceRequest.send();
        }
      };

      return DataApi;
    }
  ])