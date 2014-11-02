var r = require('rethinkdb');

r.connect({
        host: 'localhost',
        port: 28015
}, function (err, conn) {
    r.dbCreate('pxscale_data')
        .run(conn, function (err) {
            conn.use("pxscale_data");
            r.tableCreate("images").run(conn, function (err, conn) {
                process.exit(0);
            });
        })
});