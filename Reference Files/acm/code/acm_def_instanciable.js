/**
 * Created by nico on 16/12/2015.
 */
var ACM = function(){

    function ACM( params ){

        this.img = params.img;
        this.margin = params.margin || 4;
        this.maxIteration = params.maxIteration || 250;
        this.minlen = params.minlen || Math.pow( .1, 2 );
        this.maxlen = params.maxlen || Math.pow( 5, 2 );
        var threshold = params.threshold || .1;

        this.canvas = document.createElement("canvas");
        document.body.appendChild( this.canvas );

        this.w = this.canvas.width  = this.img.width;
        this.h = this.canvas.height = this.img.height;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.drawImage(this.img, 0, 0);
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = this.margin;
        this.ctx.strokeRect(0, 0, this.w, this.h);

        var gradientFlow = this.ctx.getImageData(0, 0, this.w, this.h);
        var result = ChamferDistance.compute(ChamferDistance.chamfer13, gradientFlow, threshold, this.w, this.h);
        this.ctx.putImageData( gradientFlow,0,0 );

        this.flowX = result[0];
        this.flowY = result[1];

        //binding the scope for animationFrameRequests
        this.update = this.update.bind(this);

    }

    function compute( _onComplete ) {
        this.onComplete = _onComplete;
        this.snake = [];
        var count = 20;
        var r = Math.max(this.w, this.h);
        for (var i = 0; i < count; i++) {
            var a = Math.PI * 2 / count * i;
            var p = [
                Math.max(this.margin, Math.min(this.w - this.margin, ~~( this.w / 2 + Math.cos(a) * r ))),
                Math.max(this.margin, Math.min(this.h - this.margin, ~~( this.h / 2 + Math.sin(a) * r )))
            ];
            this.snake.push(p);
        }
        this.it = 0;
        this.length = 0;
        this.last = this.getsnakelength();
        cancelAnimationFrame(this.interval);
        this.update();
        this.render();
    }

    function update() {

        this.loop();
        this.render();
        this.length = this.getsnakelength();
        if (++this.it >= this.maxIteration) {
            console.log("points:", this.snake.length, 'iteration:', this.it);
            cancelAnimationFrame(this.interval);
            this.render(true);
            if( this.onComplete ){
                this.onComplete( this.snake );
            }
        } else {
            this.interval = requestAnimationFrame(this.update);
            this.last = this.length;
        }
    }

    function loop() {

        var scope = this;
        this.snake.forEach(function (p) {
            if (p[0] <= 0 || p[0] >= scope.w - 1 || p[1] <= 0 || p[1] >= scope.h - 1)return;
            var vx = (.5 - scope.flowX[~~( p[0])][~~( p[1] )] ) * 2;
            var vy = (.5 - scope.flowY[~~( p[0])][~~( p[1] )] ) * 2;
            p[0] += vx * 100;
            p[1] += vy * 100;
        });

        //add / remove
        // this.snake.forEach(function (cur, i, snake) {
        var tmp = [];
        for( var i = 0; i < this.snake.length; i++ ){

            var prev = this.snake[(i - 1 < 0 ? this.snake.length - 1 : (i - 1))];
            var cur = this.snake[i];
            var next = this.snake[(i + 1) % this.snake.length];

            var dist = distance(prev, cur) + distance(cur, next);

            //if the length is too short, don't use this point anymore
            if (dist > this.minlen){

                //if it is below the max length
                if (dist < this.maxlen) {
                    //store the point
                    tmp.push(cur);

                }else{
                    //otherwise split the previous and the next edges
                    var pp = [lerp(.5, prev[0], cur[0]), lerp(.5, prev[1], cur[1])];
                    var np = [lerp(.5, cur[0], next[0]), lerp(.5, cur[1], next[1])];

                    // and add the midpoints to the snake
                    tmp.push(pp, np);
                }
            }
        }
        this.snake = tmp;
        return this.snake;
    }

    function render(finished) {

        this.ctx.clearRect(0, 0, this.w, this.h);
        this.ctx.drawImage(this.img, 0, 0, this.w, this.h);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "#fff";
        this.ctx.fillStyle = Boolean(finished) ? "rgba( 255,0,0, .5 )" : "rgba(255,255,255,.5 )";
        this.ctx.beginPath();
        var scope = this;
        this.snake.forEach(function (p) {
            scope.ctx.lineTo(p[0], p[1]);
        });
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fill();

        this.ctx.fillStyle = "#FFF";
        this.ctx.font = "10px Verdana";
        this.ctx.fillText("iteration: " + this.it + " / " + this.maxIteration + ' length: ' + this.last.toFixed(2), 10, 10);

    }


    // total length of snake
    function getsnakelength() {
        var length = 0;
        for (var i = 0; i < this.snake.length; i++) {
            var cur = this.snake[i];
            var next = this.snake[(i + 1) % this.snake.length];
            length += distance(cur, next);
        }
        return length;
    }

    function distance( a, b) {
        var dx = a[0] - b[0];
        var dy = a[1] - b[1];
        return dx * dx + dy * dy;
    }
    function lerp(t, a, b) {
        return a + t * ( b - a );
    }

    var p = ACM.prototype;
    p.constructor = ACM;
    p.compute = compute;
    p.update = update;
    p.loop = loop;
    p.render = render;
    p.getsnakelength = getsnakelength;
    return ACM;
}({});


/**
 * Chamfer distance
 * @author Code by Xavier Philippeau
 * Kernels by Verwer, Borgefors and Thiel
 */
var ChamferDistance = function (chamfer) {

    chamfer.cheessboard = [[1, 0, 1], [1, 1, 1]];
    chamfer.chamfer3 = [[1, 0, 3], [1, 1, 4]];
    chamfer.chamfer5 = [[1, 0, 5], [1, 1, 7], [2, 1, 1]];
    chamfer.chamfer7 = [[1, 0, 14], [1, 1, 20], [2, 1, 31], [3, 1, 44]];
    chamfer.chamfer13 = [[1, 0, 68], [1, 1, 96], [2, 1, 152], [3, 1, 215], [3, 2, 245], [4, 1, 280], [4, 3, 340], [5, 1, 346], [6, 1, 413]];
    chamfer.chamfer = null;

    chamfer.init2DArray = function(w, h) {
        var arr = [];
        for (var x = 0; x < w; x++) {
            arr.push(new Float32Array(h));
        }
        return arr;
    };

    function testAndSet(output, x, y,w,h, newvalue) {
        if (x < 0 || x >= w) return;
        if (y < 0 || y >= h) return;
        var v = output[x][y];
        if (v >= 0 && v < newvalue) return;
        output[x][y] = newvalue;
    }

    chamfer.compute = function (chamfermask, imageData, threshold, w, h) {

        chamfer.chamfer = chamfermask || chamfer.chamfer13;

        var gradient = chamfer.init2DArray(w, h);
        var flowX = chamfer.init2DArray(w, h);
        var flowY = chamfer.init2DArray(w, h);
        var data = imageData.data;
        // initialize distance
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var id = ( y * w + x ) * 4;
                var luma = 0.212 * ( data[id] / 0xFF ) + 0.7152 * ( data[id + 1] / 0xFF ) + 0.0722 * ( data[id + 2] / 0xFF );
                if (luma <= threshold ) {
                    gradient[x][y] = -1;
                    data[id] = data[id + 1] = data[id + 2] = 0;
                }else{
                    data[id]=data[id+1]=data[id+2]=0xFF;
                }

            }
        }

        //normalization value
        var max = 0;
        var min = 1e10;
        //forward pass
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                var v = gradient[x][y];
                if (v < 0) continue;
                for (var k = 0; k < chamfer.chamfer.length; k++) {

                    var dx = chamfer.chamfer[k][0];
                    var dy = chamfer.chamfer[k][1];
                    var dt = chamfer.chamfer[k][2];

                    testAndSet(gradient, x + dx, y + dy,w,h, v + dt);
                    if (dy != 0) {
                        testAndSet(gradient, x - dx, y + dy,w,h,v + dt);
                    }
                    if (dx != dy) {
                        testAndSet(gradient, x + dy, y + dx,w,h, v + dt);
                        if (dy != 0) {
                            testAndSet(gradient, x - dy, y + dx,w,h, v + dt);
                        }
                    }
                    min = Math.min(min, gradient[x][y]);
                    max = Math.max(max, gradient[x][y]);
                }
            }
        }

        // backward
        for (y = h - 1; y > 0; y--) {
            for (x = w - 1; x > 0; x--) {
                v = gradient[x][y];
                if (v < 0) continue;
                for (k = 0; k < chamfer.chamfer.length; k++) {
                    dx = chamfer.chamfer[k][0];
                    dy = chamfer.chamfer[k][1];
                    dt = chamfer.chamfer[k][2];
                    testAndSet(gradient, x - dx, y - dy,w,h, v + dt);
                    if (dy != 0) {
                        testAndSet(gradient, x + dx, y - dy,w,h, v + dt);
                    }
                    if (dx != dy) {
                        testAndSet(gradient, x - dy, y - dx,w,h, v + dt);
                        if (dy != 0) {
                            testAndSet(gradient, x + dy, y - dx,w,h, v + dt);
                        }
                    }
                }
                min = Math.min(min, gradient[x][y]);
                max = Math.max(max, gradient[x][y]);
            }
        }

        // normalize
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                if (x == 0 || x == w - 1 || y == 0 || y == h - 1) {
                    flowX[x][y] = flowY[x][y] = 0;
                    continue;
                }
                dx = ( gradient[x + 1][y] - gradient[x - 1][y] ) * .5 + max * .5;
                dy = ( gradient[x][y + 1] - gradient[x][y - 1] ) * .5 + max * .5;
                flowX[x][y] = dx / max;
                flowY[x][y] = dy / max;

                //render values to imageData
                id = ( y * w + x ) * 4;
                data[id] = data[id+1] = data[id+2] = 0xFF - map( gradient[x][y],min,max/2, 0,0xFF );
                data[id+3] = 0xFF;
            }
        }
        imageData.data = data;

        return [flowX, flowY];
    };

    function lerp(t, a, b) {
        return a + t * ( b - a );
    }
    function norm(t, a, b) {
        return ( t - a ) / ( b - a );
    }
    function map(t, a0, b0, a1, b1) {
        return lerp(norm(t, a0, b0), a1, b1);
    }
    return chamfer;
}({});
