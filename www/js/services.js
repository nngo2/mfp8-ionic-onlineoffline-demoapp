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
      }

      return {
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
    }
  ])