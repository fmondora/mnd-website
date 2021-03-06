angular.module("mnd-web.components")

.factory("PomodoroService", ["$rootScope", function ($rootScope) {

	var start = function (taskId, pomodoroId) {
		var event = {
			action: "start"
		};
		return Ceres.call("addPomodoroEvent", taskId, pomodoroId, event);
	};

	var pause = function (taskId, pomodoroId, reason) {
		var event = {
			action: "pause",
			reason: reason
		};
		return Ceres.call("addPomodoroEvent", taskId, pomodoroId, event);
	};

	var stop = function (taskId, pomodoroId) {
		var event = {
			action: "stop"
		};
		return Ceres.call("addPomodoroEvent", taskId, pomodoroId, event);
	};

	var abort = function (taskId, pomodoroId, reason) {
		var event = {
			action: "abort"
		};
		return Ceres.call("addPomodoroEvent", taskId, pomodoroId, event);
	};

	var setDuration = function (taskId, pomodoroId, duration) {
		return Ceres.call("setPomodoroDuration", taskId, pomodoroId, duration);
	};

	var calculateElapsed = function (pomodoro) {
		return pomodoro.events.reduce(function (pre, cur, idx, arr) {
			if (idx % 2 === 1) {
				pre += arr[idx].time - arr[idx - 1].time;
				return pre;
			} else if (idx === (arr.length - 1)) {
				pre += Date.now() - (arr[idx].time + $rootScope.serverTimeDelta);
				return pre;
			} else {
				return pre;
			}
		}, 0);
	};

	var calculateRemaining = function (pomodoro) {
		var elapsed = calculateElapsed(pomodoro);
		var remaining = pomodoro.duration - elapsed;
		if (remaining < 1000) {
			remaining = 0;
		}
		return remaining;
	};

	return {
		start: start,
		pause: pause,
		stop: stop,
		abort: abort,
		setDuration: setDuration,
		calculateElapsed: calculateElapsed,
		calculateRemaining: calculateRemaining
	};
}])

.directive("mndPomodoroTimer", ["$interval", "$rootScope", "PomodoroService", function ($interval, $rootScope, PomodoroService) {
	return {
		restrict: "EA",
		templateUrl: "components/pomodoro/pomodoro-timer.html",
		replace: true,
		scope: {
			pomodoro: "=",
			taskId: "@",
			size: "@?"
		},
		link: function ($scope, $element) {

			///////////
			// Setup //
			///////////
			
			var CW = parseInt($scope.size || "100", 10);
			var HCW = CW / 2;
			$scope.format = "mm:ss";

			var svg = $element.find("svg");
			var path = $element.find("path");
			var circle = $element.find("circle");
			var div = $element.find("div");

			//$element.css({
			//	width: CW + "px",
			//	height: CW + "px"
			//});

			svg.attr("width", CW);
			svg.attr("height", CW);
			svg.attr("viewbox", "0 0 " + CW + " " + CW);

			path.attr("transform", "translate(" + HCW + ", " + HCW + ")");

			circle.attr("r", HCW * 0.7);
			circle.attr("transform", "translate(" + HCW + ", " + HCW + ")");

			//div.css({
			//	"height": CW + "px",
			//	"line-height": CW + "px",
			//	"font-size": CW * 0.20 + "px"
			//});

			///////////////////////
			// Drawing functions //
			///////////////////////

			var drawCircle = function () {
				if ($scope.remaining === 0) {
					path.remove();
					circle.attr("r", HCW);
					return;
				}
				var angleInRadiants = (1 - $scope.remaining/$scope.pomodoro.duration) * 2 * Math.PI;
				var x = Math.sin(angleInRadiants) * HCW;
				var y = Math.cos(angleInRadiants) * HCW * -1;
				var widerThanPI = (angleInRadiants > Math.PI ) ? 1 : 0;
				var animation = "M 0 0 v -" + HCW + " A " + HCW + " " + HCW + " 1 " + widerThanPI + " 1 " + x + " " + y + " z";
				path.attr("d", animation);
			};

			var render = function () {
				$scope.remaining = PomodoroService.calculateRemaining($scope.pomodoro);
				drawCircle();
			};

			////////////////////
			// Initial render //
			////////////////////
			
			$scope.$watch("pomodoro._id", function () {
				render();
			});

			/////////////////
			// Timer Alarm //
			/////////////////

			var timerAlarm = new Audio('https://s3.amazonaws.com/mnd-website/alert-sound/pomodoro-alert.mp3');

			/////////////////
			// Timer setup //
			/////////////////

			$scope.$watch("pomodoro.status", function (status) {
				if (status === "running") {
					$scope.interval = $interval(function () {
						render();
						if ($scope.ticker) {
							$rootScope.$emit("pomodoroTick", $scope.pomodoro._id, $scope.remaining);
						}
						if ($scope.remaining === 0) {
							$interval.cancel($scope.interval);
							PomodoroService.stop($scope.taskId, $scope.pomodoro._id);
							timerAlarm.play();
						}
					}, 1000);
				} else if (status === "paused") {
					$interval.cancel($scope.interval);
				} else if (status === "stopped") {
					$interval.cancel($scope.interval);
					$scope.remaining = 0;
				}
			});
			// Clear the interval when the scope is destroyed
			$scope.$on("$destroy", function () {
				$interval.cancel($scope.interval);
			});

		}
	};

}]);
