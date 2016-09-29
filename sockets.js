var socketIO = require('socket.io'),
    uuid = require('node-uuid'),
    crypto = require('crypto');

var screenInfo = {};
module.exports = function (server, config) {
    var io = socketIO.listen(server);


    io.sockets.on('connection', function (client) {
        client.resources = {
            screen: false,
            video: true,
            audio: false
        };

        function sendpeer() {
          var peers = [];
          Object.keys(io.sockets.in(client.room).server.eio.clients).forEach(function(jjj) {
            peers.push({
              id: jjj,
              info: screenInfo[jjj]
            });
          })
          io.sockets.in(client.room).emit('getpeer',peers);
        }


        client.on('signal', function(type,dest,sdp) {

          console.log('signal',dest);

          if ( type == 'offer') {
            io.sockets.connected[dest].emit('receiveOffer',client.id,sdp);
          }
          else if ( type == 'answer') {
            io.sockets.connected[dest].emit('receiveAnswer',client.id,sdp);
          }


        });

        client.on('localcandidate', function(peer,candidate) {

          Object.keys(io.sockets.in(client.room).server.eio.clients).forEach(function(jjj) {
            if (jjj === client.id) {
              return;
            }
            //io.sockets.in(client.room).emit('receivelocalcandidate',client.id,candidate);
            io.sockets.connected[peer].emit('receivelocalcandidate',client.id,candidate);
          })

        });
        client.on('remotecandidate', function(peer,candidate) {

          Object.keys(io.sockets.in(client.room).server.eio.clients).forEach(function(jjj) {
            if (jjj === client.id) {
              return;
            }
            //io.sockets.in(client.room).emit('receiveremotecandidate',client.id,candidate);
            io.sockets.connected[peer].emit('receiveremotecandidate',client.id,candidate);
          })

        });


        function removeFeed(type) {
            if (client.room) {
              console.log('DISCON-LOG');
                io.sockets.in(client.room).emit('remove', {
                    id: client.id,
                    type: type
                });
                if (!type) {
                    client.leave(client.room);
                    client.room = undefined;
                    delete screenInfo[client.id];
                }
            }
        }
        function testca() {
          console.log('testca');
        }

        function join(name, cb) {
            // sanity check
            if (typeof name !== 'string') return;
            // check if maximum number of clients reached
            if (config.rooms && config.rooms.maxClients > 0 &&
                clientsInRoom(name) >= config.rooms.maxClients) {
                safeCb(cb)('full');
                return;
            }
            // leave any existing rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name);
            client.room = name;
        }

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function () {
            removeFeed();
        });
        client.on('leave', function () {
            removeFeed();
        });

        client.on('create', function (name, streamBoolean, cb) {

          cb = (typeof cb == 'function') ? cb : function () {};
          name = name || uuid();
          screenInfo[client.id] = streamBoolean;

          // check if exists
          var room = io.nsps['/'].adapter.rooms[name];
          if (room && room.length) {
              safeCb(cb)('taken');
          } else {
              join(name);
              safeCb(cb)(null, name);
          }
          sendpeer();

        });


    });


    function describeRoom(name) {
        var adapter = io.nsps['/'].adapter;
        var clients = adapter.rooms[name] || {};
        var result = {
            clients: {}
        };
        Object.keys(clients).forEach(function (id) {
            result.clients[id] = adapter.nsp.connected[id].resources;
        });
        return result;
    }

    function clientsInRoom(name) {
        return io.sockets.clients(name).length;
    }

};

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function () {};
    }
}
