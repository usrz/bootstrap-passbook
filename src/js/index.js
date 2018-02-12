import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.css';
import '../css/custom.css';
import '../css/slider.css';
// import '../less/slider.less';
import '../less/passbook.less';

const $ = require('jquery');

window.$ = $;
window.jQuery = $;
require('bootstrap');
require('./passbook.js');
require('./bootstrap-slider.js');

$(document).ready(() => {
  const passbook = $('#passbook').passbook();
  passbook.passbook('edit');
});
