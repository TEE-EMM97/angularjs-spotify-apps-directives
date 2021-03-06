angular.module('sp-list-ng', [])
  .directive('spList', function () {

    var types = {
      int: 0,
      string: 1,
      list: 2,
      object: 3
    };

    // these are the properties supported
    // see https://developer.spotify.com/docs/apps/views/1.0/list-list.html#availableOptions
    // for more info
    var availableAttribs = {
      numItems: types.int,
      fetch: types.string,
      numBuckets: types.int,
      header: types.string,
      layout: types.string,
      fields: types.list,
      height: types.string,
      unplayable: types.string,
      style: types.string,
      imageOptions: types.object,
      visualOffset: types.int,
      throbber: types.string,
      viewAllLimit: types.int
    };

    return {
      restrict: 'EA',
      replace: true,
      link: function ($scope, elements, attrs) {
        var playlist,
            element = elements[0];

        attrs.$observe('uri', function (newval, oldval) {
          if (!attrs.uri) {
            return;
          }
          require(['$views/list#List', '$api/models'], function (List, models) {
            if (newval !== oldval) {
              if (newval === null && element.childNodes.length) {
                element.removeChild(element.childNodes[0]);
              } else {
                entity = models.fromURI(attrs.uri);

                var options = {};

                for (var i in attrs) {
                  if (attrs.hasOwnProperty(i) && i.indexOf('$') !== 0) {
                    if (i in availableAttribs) {
                      switch (availableAttribs[i]) {
                        case types.string:
                          options[i] = attrs[i];
                          break;
                        case types.int:
                          options[i] = parseInt(attrs[i], 10);
                          break;
                        case types.list:
                          options[i] = attrs[i].split(',');
                          break;
                        case types.object:
                          options[i] = JSON.parse(attrs[i]);
                          break;
                        default:
                          console.error('Unrecognized type ' + availableAttribs[i]);
                      }
                    }
                  }
                }

                var injectList = function(list) {
                  if (element.childNodes.length) {
                    element.replaceChild(list.node, element.childNodes[0]);
                  } else {
                    element.appendChild(list.node);
                  }
                  list.init();
                };

                if (entity instanceof models.Playlist) {
                  list = List.forPlaylist(entity, options);
                  injectList(list);
                } else if (entity instanceof models.Album) {
                  list = List.forAlbum(entity, options);
                  injectList(list);
                } else if (entity instanceof models.Track) {
                  (function(entity) {
                    models.Playlist
                      .createTemporary('tmp_' + attrs.uri + '_' + Math.random())
                      .done(function (playlist) {
                        playlist.load('tracks').done(function () {
                          playlist.tracks.add(entity).done(function () {
                            list = List.forCollection(playlist, options);
                            injectList(list);
                          });
                        });
                      });
                  })(entity);
                } else {
                  console.error('Unrecognized entity', entity);
                }
              }
            }
          });
        });
      }
    };
  });