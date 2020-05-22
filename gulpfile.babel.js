import gulp from "gulp";
import gpug from "gulp-pug";
import del from "del";
import merge from 'merge-stream';
import vinylBuffer from 'vinyl-buffer';
import ws from "gulp-webserver";
// import ejs from 'gulp-ejs';
import image from "gulp-image";
import imagemin from "gulp-imagemin";
import spritesmith from 'gulp.spritesmith-multi';
import sass from "gulp-sass";
import autoprefixer from "gulp-autoprefixer";
import csso from "gulp-csso";
import bro from "gulp-bro";
import babelify from "babelify";
import ghPages from "gulp-gh-pages";
import sassGlob from "gulp-sass-glob";
import cleanCss from 'gulp-clean-css';

sass.compiler = require("node-sass");

const routes = {
    pug: {
        src: "./src/*.pug",
        dest: "./dist",
        watch: "./src/**/*.pug"
    },
    html: {
        src: "./src/html/**/*",
        dest: "./dist/html"
    },
    img: {
        src: "./src/img/**/*",
        dest: "./dist/img",
        sprite: "./src/img/sprite/*.png"
    },
    scss: {
        src: "./src/scss/style.scss",
        dest: "./dist/css",
        watch: "./src/scss/**/*.scss",
        handlebars: "./src/scss/vendor/spritesmith-mixins.handlebars",
        vendor : "./src/scss/vendor"
    },
    js: {
        src: "./src/js/main.js",
        dest: "./dist/js",
        watch: "./src/js/**/*.js"
    }
};

const clean = () => del(["dist/", ".publish"]);

const pug = () =>
    gulp
    .src(routes.pug.src)
    .pipe(gpug())
    .pipe(gulp.dest(routes.pug.dest));

const html = () =>
gulp
.src(routes.html.src)
.pipe(gulp.dest(routes.html.dest));

const webserver = () =>
    gulp
    .src(routes.pug.dest)
    .pipe(ws({
        livereload: true,
        open: true
    }));

const img = () =>
    gulp
    .src([
        routes.img.src,
        '!./src/img/sprite',
        '!./src/img/sprite/*.png'
    ])
    .pipe(image())
    .pipe(gulp.dest(routes.img.dest));

const devSassCompile = () =>
    gulp
    .src(routes.scss.src, {sourcemaps: true})
    .pipe(sassGlob())
    .pipe(sass({
        outputStyle: 'compact'
    }).on('error', sass.logError))
    .pipe(
        autoprefixer()
    )
    .pipe(cleanCss({format: 'keep-breaks'}))
    // .pipe(csso())
    .pipe(gulp.dest(routes.scss.dest, {sourcemaps: '.'}));

// const sendSassCompile = () =>
//     gulp
//     .src(routes.scss.src)
//     .pipe(sassGlob())
//     .pipe(sass({
//         outputStyle: 'compact'
//     }).on('error', sass.logError))
//     .pipe(
//         autoprefixer()
//     )
//     .pipe(cleanCss({format: 'keep-breaks'}))
//     // .pipe(csso())
//     .pipe(gulp.dest(routes.scss.dest));

const sprite = () => {
    const opts = {
        spritesmith: function (options, sprite) {
            options.imgPath = routes.img.dest;
            options.cssName = `_${sprite}-mixins.scss`;
            options.cssTemplate = routes.scss.handlebars;
            options.cssSpritesheetName = sprite;
            options.padding = 4;
            options.algorithm = 'binary-tree';
            return options
        }
    }
    const spriteData = gulp.src(routes.img.sprite)
        .pipe(spritesmith(opts)).on('error', function (err) {
            console.log(err)
        });

    // Pipe image stream through image optimizer and onto disk
    const imgStream = spriteData.img
        .pipe(vinylBuffer())
        .pipe(imagemin())
        .pipe(gulp.dest(routes.img.dest));

    // Pipe CSS stream through CSS optimizer and onto disk
    const cssStream = spriteData.css
        // .pipe(csso())
        .pipe(gulp.dest(routes.scss.vendor));

    // Return a merged stream to handle both `end` events
    return merge(imgStream, cssStream);
}

const js = () =>
    gulp
    .src(routes.js.src)
    .pipe(bro({
        transform: [
            babelify.configure({
                presets: ['@babel/preset-env']
            }),
            ["uglifyify", {
                global: true
            }]
        ]
    }))
    .pipe(gulp.dest(routes.js.dest));

const gh = () => gulp.src([
    "./dist/**/*",
    "!./dist/**/*.map"
]).pipe(ghPages());

const watch = () => {
    gulp.watch(routes.pug.watch, pug);
    gulp.watch(routes.html.src, html);
    gulp.watch(routes.img.src, img);
    gulp.watch(routes.scss.watch, devSassCompile);
    gulp.watch(routes.js.watch, js);
};

const prepare = gulp.series(clean, sprite, img);
const assets = gulp.series(pug, html, devSassCompile, js);
const live = gulp.parallel(webserver, watch);

export const build = gulp.series(prepare, assets);
export const dev = gulp.series(build, live);
export const deploy = gulp.series(build, gh, clean);
export const send = gulp.series(sendSassCompile);