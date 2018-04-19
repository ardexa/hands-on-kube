'use strict';

(function() {
  angular.module('kubeApp', [])
    .controller('KubeController', function($http) {
      var app = this;
      app.contact = function() {
        $http.get('/api/')
          .then(function(res) {
            app.apiData = res.data
          })
          .catch(() => null);
      };

      app.crashAPI = function() {
        $http.delete('/api/')
          .catch(() => null);
      };
    });
})();
