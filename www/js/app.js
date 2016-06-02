//////////////////////////////////////////////////////////////
///
///     MINDER MOBILE
///     WRITTEN BY: CONNOR EDWARDS
///     DATE: 24/5/16
///     (c) Noval Studios, 2016 -
///     MIT License (MIT) | Open Source Initiative
///
//////////////////////////////////////////////////////////////

angular.module('minder', ['ionic'])

.run(function($ionicPlatform, $http) {
    $ionicPlatform.ready(function() {
        if(window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if(window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
})

// Routing
.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

    $stateProvider

    .state('menu', {
        url: '/menu',
        templateUrl: 'templates/tabs.html',
        controller: 'menuCtrl'
    })

    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html',
        controller: 'loginCtrl'
    })

    .state('task_dash', {
        url: '/task_dash',
        templateUrl: 'templates/task_dash.html',
        controller: 'taskCtrl'
    })

    $urlRouterProvider.otherwise('/login');
    $httpProvider.interceptors.push('httpInterceptor');

})

// Controllers
.controller('menuCtrl', function($scope, $ionicSideMenuDelegate, loginServ) {
    // Toggle the menu
    $scope.toggleMenu = function() {
        $ionicSideMenuDelegate.toggleLeft();
    }
    $scope.logout = function() {
        loginServ.logout();
    }
})

.controller('taskCtrl', function($scope, auth, tasks, $ionicLoading) {

    $scope.getTasks = function() {
        $ionicLoading.show({
            template: "Getting tasks..."
        })
        tasks.get()
        .then(function(tasks) {
            $scope.tasks = tasks;
        })
        .then(function() {
            $ionicLoading.hide();
        })
        $scope.$broadcast('scroll.refreshComplete');
    }

    // Waiting for the view to load
    auth.checkAuth()
    .then(function() {
        $scope.getTasks();
    })

})

.controller('loginCtrl', function($scope, loginServ, auth, redirect) {
    // Function to login user
    $scope.login = function(logindata) {
        loginServ.login(logindata);
    }
    // Checking if the user is logged in
    auth.checkAuth()
    .then(function() {
        redirect.go('task_dash');
    })
})

.factory('redirect', function($state) {
    return {
        go: function(location) {
            $state.go(location);
        }
    }
})

// loginServ
.factory('loginServ', function($q, $http, redirect, $ionicPopup, tokenServ, $ionicLoading) {
    return {
        login: function(login) {
            $ionicLoading.show({
                template: "Logging in..."
            });
            $http.post("http://client.minder.noval-technologies.uk/api/auth", login)
            .then(function(response){
                tokenServ.setToken(response.data.token)
                .then(function() {
                    $ionicLoading.hide();
                    redirect.go('task_dash');
                })
                .catch(function(err) {
                    $ionicLoading.hide();
                    $ionicPopup.alert({
                        title: "Failed to login!",
                        template: err
                    })
                })
            })
            .catch(function(err) {
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: "Failed to login!",
                    template: err.message
                })
            })
            return q.promise;
        },
        logout: function() {
            // Logging the user out
            tokenServ.unsetToken()
            .then(function() {
                redirect.go('login');
            })
            .catch(function(err){
                $ionicPopup.alert({
                    title: "Failed to logout!",
                    template: err
                })
            })
        }
    }
})

.factory('tasks', function($q, $ionicPopup, $http) {
    return {
        get: function() {
            // Creating the promise
            var q = $q.defer();
            // Getting the tasks
            $http.get("http://api.noval-technologies.uk/api/tasks")
            .then(function(response) {
                q.resolve(response.data.tasks);
            })
            .catch(function(err) {
                $ionicPopup.alert({
                    title: "Failed to get tasks!",
                    template: err.message
                });
            })
            // Returning the promise
            return q.promise;
        }
    }
})

.factory('auth', function($q, redirect, tokenServ) {
    return {
        checkAuth: function() {
            // Creating the promise
            var q = $q.defer();
            // Checking that the user is logged in
            tokenServ.checkToken()
            .then(function(cb) {
                if (cb === true) {
                    q.resolve();
                } else if (cb === false) {
                    redirect.go('login');
                }
            })
            return q.promise;
        }
    }
})

.factory('tokenServ', function($q) {
    return {
        getToken: function() {
            // Creating the promise
            var q = $q.defer();
            // Checking that a token actually exists
            this.checkToken()
            .then(function(cb) {
                if (cb === true) {
                    var token = window.localStorage.getItem("auth-token");
                    q.resolve(token);
                } else if (cb === false) {
                    q.reject(false);
                }
            })
            // Sending back promise
            return q.promise;
        },
        unsetToken: function() {
            // Deleting the token
            var q = $q.defer();
            window.localStorage.removeItem("auth-token");
            // Check if it has
            this.checkToken()
            .then(function(result) {
                if (result === true) {
                    q.reject("Failed to unset token!");
                } else if (result === false) {
                    q.resolve();
                }
            })
            return q.promise;
        },
        checkToken: function() {
            // Used to check if the token is set
            var q = $q.defer();
            // Checking the token
            var token = window.localStorage.getItem("auth-token");
            if (token === null) {
                q.resolve(false);
            } else if (token) {
                q.resolve(true);
            }
            // Sending back to promise
            return q.promise;
        },
        setToken: function(token_to_set) {
            // Creating the promise
            var q = $q.defer();
            // Setting the token
            window.localStorage['auth-token'] = token_to_set;
            // Checking that the token is set
            this.checkToken()
            .then(function() {
                q.resolve();
            })
            .catch(function() {
                q.reject("Failed to set token!");
            })
            return q.promise;
        }
    }
})

// HTTP interceptor
.factory('httpInterceptor', function($q, tokenServ, $injector) {
    return {
        request: function(control) {
            // Injecting token
            tokenServ.getToken()
            .then(function(token) {
                // Setting token in Headers
                 control.headers = {
                    'x-access-token': token,
                    'Content-Type': 'application/json'
                }
            })
            return $q.resolve(control);
        },
        requestError: function(rejection) {
            return $q.reject(rejection);
        },
        response: function(response) {
            return $q.resolve(response);
        },
        responseError: function(rejection) {
            // Checking the response
            if (rejection.status === -1) { // Lost connection
                rejection.message = "Lost connection!";
            } else if (rejection.status === 404) {
                rejection.message = "API Could not be found :(";
            } else if (rejection.status === 403 || rejection.status === 401 || rejection.status === 502) {
                $injector.get('loginServ').logout();
                rejection.message = rejection.data.message;
            } else {
                rejection.message = rejection.data.message;
            }
            return $q.reject(rejection);
        }
    }
})
