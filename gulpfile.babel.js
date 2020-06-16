import {src, dest, series, parallel, watch, lastRun} from "gulp";
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import del from "del";
import merge from 'merge-stream';
import vinylBuffer from 'vinyl-buffer';
import sass from "gulp-sass";
import sassGlob from "gulp-sass-glob";
import cleanCss from 'gulp-clean-css';
import image from "gulp-image";
import imagemin from "gulp-imagemin";
import spritesmith from 'gulp.spritesmith-multi';
import autoprefixer from "gulp-autoprefixer";
import bro from "gulp-bro";
import ejs from 'gulp-ejs';
import babelify from "babelify";
import ghPages from "gulp-gh-pages";
import ws from "gulp-webserver";
import esLint from 'gulp-eslint';
// import browserSync from 'browser-sync';

sass.compiler = require("node-sass");

const routes = {
    html: {
        watch: "./src/html/**/*",
        src: "./src/html/**/*.html",
        dest: "./dist/html",
        webserver: "./dist"
    },
    font: {
        src: "./src/font",
        dest: "./dist/font"
    },
    img: {
        watch: [
            "./src/img/**/*",
            "!./src/img/sprite",
            "!./src/img/sprite/*.png"
        ],
        dest: "./dist/img"
    },
    sprite: {
        src: "./src/img/sprite/*.png",
        path: "../img"
    },
    scss: {
        watch: [
            "./src/css/scss/**/**/*.scss",
            '!./src/css/scss/vendor/*-mixins.scss'
        ],
        src: {
            root: "./src/css/scss/common.scss",
            libs: "./src/css/libs/*.css"
        },
        handlebars: "./src/css/scss/vendor/spritesmith-mixins.handlebars",
        vendor: "./src/css/scss/vendor",
        dest : {
            root: "./dist/css",
            libs: "./dist/css/libs",
            del: [
                "./dist/css/*.css",
                "./dist/css/*.map"
            ]
        }
    },
    js: {
        src : {
            root: [
                "./src/js/**/*.js",
                "!./src/js/libs/*.js"
            ],
            libs: "./src/js/libs/*.js"
        },
        dest: {
            root: "./dist/js",
            libs: "./dist/js/libs",
            del : "/dist/js/*.js"
        }
    },
    gh: {
        except: ["./dist/**/*", "!./dist/**/*.map"]
    }
};

// clean function
const distClean = () => del(["dist/", ".publish"]);
const cssLibsClean = () => del(routes.scss.dest.libs);
const jsLibsClean = () => del(routes.js.dest.libs);
export const cssClean = () => del(routes.scss.dest.del);
const jsClean = () => del(routes.js.dest.del);


const html = () =>
    src(routes.html.src)
    .pipe(ejs())
    .pipe(dest(routes.html.dest));

const img = () =>
    src(routes.img.watch, {
        since: lastRun(img)
    })
    .pipe(image())
    .pipe(dest(routes.img.dest));

const font = () =>
    src(routes.font.src)
    .pipe(dest(routes.font.dest));

const sprite = () => {
    const opts = {
        spritesmith: function (options, sprite) {
            options.imgPath = `${routes.sprite.path}/${sprite}.png`;
            options.cssName = `_${sprite}-mixins.scss`;
            options.cssTemplate = routes.scss.handlebars;
            options.cssSpritesheetName = sprite;
            options.padding = 4;
            options.algorithm = 'binary-tree';
            return options
        }
    }
    const spriteData = src(routes.sprite.src)
        .pipe(spritesmith(opts)).on('error', function (err) {
            console.log(err)
        });

    // Pipe image stream through image optimizer and onto disk
    const imgStream = spriteData.img
        .pipe(vinylBuffer())
        .pipe(imagemin())
        .pipe(dest(routes.img.dest));

    // Pipe CSS stream through CSS optimizer and onto disk
    const cssStream = spriteData.css
        // .pipe(csso())
        .pipe(dest(routes.scss.vendor));

    // Return a merged stream to handle both `end` events
    return merge(imgStream, cssStream);
}

const sassCompile = () =>
    src(routes.scss.src.root, {
        sourcemaps: true
    })
    .pipe(sassGlob())
    .pipe(sass({
        outputStyle: 'compact'
    }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCss({
        format: 'keep-breaks'
    }))
    .pipe(dest(routes.scss.dest.root, {
        sourcemaps: '.'
    }));

const destCssLibs = () =>
    src(routes.scss.src.libs)
    .pipe(dest(routes.scss.dest.libs));
    
const eslint = (done) => {
    src(routes.js.src.root)
    .pipe(esLint())
    .pipe(esLint.format())
    .pipe(esLint.failAfterError());

    done();
}

const js = () =>
    src(routes.js.src.root)
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
    .pipe(dest(routes.js.dest.root));

const destJsLibs = () =>
    src(routes.js.src.libs)
    .pipe(dest(routes.js.dest.libs));

const makeIndexFile = () => {
    const dPath = routes.html.dest,  // index를 생성할 파일들이 있는 저장소
        // info = gitRepoInfo(), // git 정보 생성
        fileInfo = fs.readdirSync(dPath); // 파일 목록 불러오는 함수를 동기적으로 수정
    let normalFiles = []; // 파일 정보를 저장할 배열 생성

    fileInfo.map(function (file) {
        return path.join(dPath, file);
    }).filter(function (file) {
        return fs.statSync(file).isFile();
    }).forEach(function (file) {
        let stats = fs.statSync(file);
        //HTML 파일만 거르기
        let extname = path.extname(file),
            basename = path.basename(file);
        if (extname == '.html') {
            // 일반 file info를 저장할 객체 생성
            let nfileData = {};
            // title 텍스트 값 추출
            let fileInnerText = fs.readFileSync(file, 'utf8');
            let $ = cheerio.load(fileInnerText);
            let wholeTitle = $('title').text(),
                splitTitle = wholeTitle.split(' : ');
            // 객체에 데이터 집어넣기
            nfileData.title = splitTitle[0];
            nfileData.name = basename;
            nfileData.category = String(nfileData.name).substring(0, 2);
            nfileData.categoryText = splitTitle[1];
            nfileData.mdate = new Date(stats.mtime);
            // 파일수정시점 - 대한민국 표준시 기준
            nfileData.ndate = nfileData.mdate.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul'
            }) + ' (GMT+9)';
            // title 마지막 조각 , 인덱스에 붙은 라벨 식별 및 yet 인 경우 수정날짜정보 제거
            nfileData.status = splitTitle[2];
            if (typeof splitTitle[2] == 'undefined' || splitTitle[2] == null || splitTitle[2] == '') {
                nfileData.status = '';
            } else if (splitTitle[2] == 'yet') {
                nfileData.mdate = '';
                nfileData.ndate = '';
            }
            normalFiles.push(nfileData);
        }
    });

    let projectObj = {
        nfiles: normalFiles
        // branch: info.branch, // git 사용시
        // commits: log, // git 사용시
    }
    let projectObjStr = JSON.stringify(projectObj);
    let projectObjJson = JSON.parse(projectObjStr);

    //index 파일 쓰기
    return src('index.html')
        .pipe(ejs(projectObjJson))
        .pipe(dest(routes.html.webserver))
        // .pipe(browserSync.stream())

}

const webserver = () =>
    src(routes.html.webserver)
    .pipe(ws({
        livereload: true,
        open: true
    }));

const gh = () =>
    src(routes.gh.except)
    .pipe(ghPages());

const gulpWatch = () => {
    watch(routes.scss.src.libs, series(cssLibsClean, destCssLibs));
    watch(routes.js.src.libs, series(jsLibsClean, destJsLibs));    
    watch(routes.html.watch, series(html, makeIndexFile));
    watch(routes.img.watch, img);
    watch(routes.sprite.src, series(sprite, sassCompile));
    watch(routes.scss.watch, series(cssClean, sassCompile));
    watch(routes.js.src.root, series(jsClean, eslint, js));
};

const prepare = series(distClean, sprite, img);
const destLibs = parallel(destCssLibs, destJsLibs);
const assets = series(font, html, sassCompile, eslint, js);
const live = parallel(webserver, makeIndexFile, gulpWatch);

export const build = series(prepare, destLibs, assets);
export const dev = series(build, live);
export const deploy = series(build, gh, distClean);