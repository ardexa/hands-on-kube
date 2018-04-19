'use strict';

(function() {
  angular.module('kubeApp', [])
    .controller('KubeController', function($http, $interval, $scope) {
      var app = this;
      app.work = {};

      app.contact = function() {
        $http.get('/api/')
          .then(function(res) {
            app.apiData = res.data;
          });
      };

      app.crashAPI = function() {
        $http.delete('/api/');
      };

      app.doWork = function() {
        $http.post('/api/work', app.work)
          .then(function(res) {
            app.workReply = res.data;
          });

        // Start polling for results
        if (!angular.isDefined(app.stop)) {
          app.stop = $interval(function() {
            $http.get('/api/work')
              .then(function(res) {
                app.workResults = res.data;
              });
          }, 500);
        }
      };

      app.stopPolling = function() {
        if (angular.isDefined(app.stop)) {
          $interval.cancel(app.stop);
          app.stop = undefined;
        }
      };

      $scope.$on('$destroy', function() {
        // Make sure that the interval is destroyed too
        app.stopPolling();
      });

    });
})();
