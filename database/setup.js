var r = require('rethinkdb');

r.connect({
        host: 'localhost',
        port: 28015
}, function (err, conn) {
    console.log(err)
    r.dbCreate('pxscale_data')
        .run(conn, function (err) {
            var redirects, colors, o2o;
            
            console.log(err)
            
            conn.use("pxscale_data");
            
            r.tableCreate("redirects").run(conn, function (err, conn) {
                redirects = true;
                finish(redirects, colors, o2o);              
            });
            
            r.tableCreate("colors").run(conn, function (err, conn) {
                colors = true;
                finish(redirects, colors, o2o);
            });
            
            r.tableCreate("o2o").run(conn, function (err, conn) {
                o2o = true;
                finish(redirects, colors, o2o);
            });
        })
});

function finish() {
    var done = true;
    for (var argI in arguments) {
        var arg = arguments[argI];
        done = arg && done;
    }
    
    if (done) {
        console.log("Rethink is set up!")
        process.exit(0);
    }
}