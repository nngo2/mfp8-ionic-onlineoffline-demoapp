angular.module('app.qExtension', []).config(['$provide', function ($provide) {
  $provide.decorator('$q', ['$delegate', function($delegate) {
    var $q = $delegate;
    
    $q.allSettled = function(promises) { // replace $q.all
      return $q.all(promises.map(function(promise) {
        return promise.then(function(value) {
          return { state: 'fulfilled', value: value };
        }, function(reason) {
          return { state: 'rejected', reason: reason };
        });
      }));
    };

    return $q;
  }]);
}]);