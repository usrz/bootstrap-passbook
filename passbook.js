/* ========================================================================== */
+function ($) { "use strict";

  var TYPE_BOARDING_PASS = 'boarding-pass';
  var TYPE_COUPON        = 'coupon';
  var TYPE_EVENT         = 'event';
  var TYPE_STORE_CARD    = 'store-card';
  var TYPE_GENERIC       = 'generic';

  var TRANSPORT_AIR      = 'air';
  var TRANSPORT_BOAT     = 'boat';
  var TRANSPORT_BUS      = 'bus';
  var TRANSPORT_TRAIN    = 'train';
  var TRANSPORT_GENERIC  = 'generic';

  var TYPE_BOARDING_PASS_C = 'passbook-boarding-pass';
  var TYPE_COUPON_C        = 'passbook-coupon';
  var TYPE_EVENT_C         = 'passbook-event';
  var TYPE_STORE_CARD_C    = 'passbook-store-card';
  var TYPE_C               = [ TYPE_BOARDING_PASS_C,
                               TYPE_COUPON_C,
                               TYPE_EVENT_C,
                               TYPE_STORE_CARD_C ].join(' ');
  
  var TRANSPORT_AIR_C      = 'passbook-transport-air';
  var TRANSPORT_BOAT_C     = 'passbook-transport-boat';
  var TRANSPORT_BUS_C      = 'passbook-transport-bus';
  var TRANSPORT_TRAIN_C    = 'passbook-transport-train';
  var TRANSPORT_C          = [ TRANSPORT_AIR_C,
                               TRANSPORT_BOAT_C,
                               TRANSPORT_BUS_C,
                               TRANSPORT_TRAIN_C ].join(' ');


  /* ======================================================================== */
  /* STATIC HELPER FUNCTIONS                                                  */
  /* ======================================================================== */
  
  var _flip = function(event) {
    event.data.flip();
    event.preventDefault();
    event.stopPropagation();
  }
  
  var _edit_save = function(event) {
    var passbook = event.data;
    if (passbook.$container.hasClass('passbook-edit')) {
      passbook.save();
    } else {
      passbook.edit();
    }
    event.preventDefault();
    event.stopPropagation();
  }
  
  var _content_edited = function(event) {
    var $target = $(event.target);
    $target.text($target.text().trim());
    event.preventDefault();
    event.stopPropagation();
  }
  
  var _remove_empty_extra_fields = function(event) {
    /* Do not remove extra fields if we're left with less than 1 */
    if ($(this).parent('tr').children('th,td').length < 2) return true;
  
    /* Find our label and value fields */
    var column = $(this).parent('tr').children('th,td').index(this) + 1;
    var label = $(this).parents('table').find('th:nth-child(' + column + ')');
    var value = $(this).parents('table').find('td:nth-child(' + column + ')');
  
    /* Do not wipe if we have ANY content */
    if (label.text().length != 0) return;
    if (value.text().length != 0) return;
  
    /* Wipe the column */
    label.remove();
    value.remove();
  }

  var _add_empty_extra_fields = function(event) {
    var header = $(this).parents('table.passbook-extra-fields').find('tr');
    $(header[0]).append($('<th contenteditable/>')
                    .on('blur', _content_edited)
                    .on('blur', _remove_empty_extra_fields));
    $(header[1]).append($('<td contenteditable/>')
                    .on('blur', _content_edited)
                    .on('blur', _remove_empty_extra_fields));
  }

  var _remove_empty_back_fields = function(event) {
    var $this = $(this);

    /* Figure out label and value (row and cell) */
    var label, value, labelRow, valueRow;
    if ($this.prop("tagName") == 'TH') {
      label = $this;
      labelRow = $this.parents('tr');
      valueRow = labelRow.next('tr');
      value = valueRow.find('td');

    } else if ($this.prop("tagName") == 'TD') {
      value = $this;
      valueRow = $this.parents('tr');
      labelRow = valueRow.prev('tr');
      label = labelRow.find('th');;
    }

    /* Check if there is some content */
    if (label.text().length != 0) return;
    if (value.text().length != 0) return;
    
    /* Wipe the two label and value rows */
    labelRow.remove();
    valueRow.remove();

  }

  var _add_empty_back_fields = function(event) {
    $(this).parents('.passbook-back-fields').find('table')
          .append($('<tr>')
            .append($('<th contenteditable>')
              .on('blur', _content_edited)
              .on('blur', _remove_empty_back_fields)
            ) // </th>
          ) // </tr>
          .append($('<tr>')
            .append($('<td contenteditable>')
              .on('blur', _content_edited)
              .on('blur', _remove_empty_back_fields)
            ) // </td>
          );
  }
  
  var _find_passbook = function(from) {
    /* Easy way out? */
    var data = $(from).data('passbook');

    if (data != null) return data;

    /* Look in the current element, and all its parents */
    var parent = $(from).parent()[0];
    while ((data == null) && (parent != null)) {
      var $current = $(parent);
      data = $current.data('passbook');
      parent = $current.parent()[0];
    }

    /* Return whatever we got */
    return data;
  }

  
  
  /* ======================================================================== */
  /* BARCODE CONSTRUCTION                                                     */
  /* ======================================================================== */

  var barcode_popover = function() {
    var passbook = _find_passbook(this);
    return $($('<form role="form fade" name="barcode"/>')
         .append($('<div class="form-group">')
           .append($('<input name="barcode" type="text" class="form-control input-sm"/>'))
         ) // </div class="form-group">
         .append($('<div class="btn-toolbar">')
           .append($('<div class="btn-group">')
             .append($('<button name="pdf417" type="button" class="btn btn-default btn-xs"><i class="fa fa-barcode fa-lg"/></button>')
               .on('click', passbook, barcode_pdf417))
             .append($('<button name="qrcode" type="button" class="btn btn-default btn-xs"><i class="fa fa-qrcode fa-lg"/></button>')
               .on('click', passbook, barcode_qrcode))
           ) // </div class="btn-group">
           .append($('<div class="btn-group" style="float: right;">')
             .append($('<button type="button" class="btn btn-danger btn-xs"><i class="fa fa-times fa-lg"/></button>')
               .on('click', passbook, barcode_dismiss))
             .append($('<button type="button" class="btn btn-success btn-xs"><i class="fa fa-check fa-lg"/></button>')
               .on('click', passbook, barcode_confirm))
           ) // </div class="btn-group" style="float: right;">
         ) // </div class="btn-toolbar">
       ); // </form role="form" name="barcode"/>
  };

  var barcode_shown = function(event) {
    var passbook = event.data;
    var $container = passbook.$container;

    $container.find('input[name="barcode"]').val(passbook.barcode);
    if (passbook.barcodeType == 'pdf417') {
      $container.find('button[name="pdf417"]').addClass('btn-primary').removeClass('btn-default');
      $container.find('button[name="qrcode"]').addClass('btn-default').removeClass('btn-primary');
    } else if (passbook.barcodeType == 'qrcode') {
      $container.find('button[name="qrcode"]').addClass('btn-primary').removeClass('btn-default');
      $container.find('button[name="pdf417"]').addClass('btn-default').removeClass('btn-primary');
    } else {
      $container.find('button[name="qrcode"]').addClass('btn-default').removeClass('btn-primary');
      $container.find('button[name="pdf417"]').addClass('btn-default').removeClass('btn-primary');
    }
  }

  var barcode_pdf417 = function(event) {
    var passbook = event.data;
    var $container = passbook.$container;
    $container.find('button[name="pdf417"]').addClass('btn-primary').removeClass('btn-default btn-warning');
    $container.find('button[name="qrcode"]').addClass('btn-default').removeClass('btn-primary btn-warning');
  }

  var barcode_qrcode = function(event) {
    var passbook = event.data;
    var $container = passbook.$container;
    $container.find('button[name="pdf417"]').addClass('btn-default').removeClass('btn-primary btn-warning');
    $container.find('button[name="qrcode"]').addClass('btn-primary').removeClass('btn-default btn-warning');
  }

  var barcode_confirm = function(event) {
    var passbook = event.data;
    var $container = passbook.$container;
    
    /* Barcode value */
    var barcode = $container.find('input[name="barcode"]').val();
    if ((barcode == null) || (barcode == '')) {
      passbook.barcode = '';
      passbook.barcodeType = '';
      $container.find('.passbook-barcode')
         .removeClass('passbook-barcode-qrcode passbook-barcode-pdf417')
         .removeAttr('style');
      $container.find('.passbook-barcode').popover('hide')
                .next('.popover').css('display', 'none');
      return;
    };

    /* Barcode type */
    var barcodeType;
    var pdf417 = $container.find('button[name="pdf417"]');
    var qrcode = $container.find('button[name="qrcode"]');
    if (pdf417.hasClass('btn-primary')) {
      barcodeType = 'pdf417';
    } else if (qrcode.hasClass('btn-primary')) {
      barcodeType = 'qrcode';
    } else {
      pdf417.addClass('btn-warning');
      qrcode.addClass('btn-warning');
      return;
    }

    /* Save and dismiss */
    passbook.barcode = barcode;
    passbook.barcodeType = barcodeType;
    var code = new Barcode(barcodeType, barcode, { version: 6 });
    var image = code.createImageData(3);
    $container.find('.passbook-barcode')
               .css('background-image', 'url(' + image + ')')
               .css('background-size', (code.cols * 3) + 'px ' + (code.rows * 3) + 'px')
               .removeClass('passbook-barcode-qrcode passbook-barcode-pdf417')
               .addClass('passbook-barcode-' + barcodeType);
    $container.find('.passbook-barcode').popover('hide')
              .next('.popover').css('display', 'none');
  }

  var barcode_dismiss = function(event) {
    var passbook = event.data;
    var $container = passbook.$container;
    $container.find('.passbook-barcode').popover('hide')
              .next('.popover').css('display', 'none');
  }
  
  /* ======================================================================== */
  /* COLOR PICKER                                                             */
  /* ======================================================================== */

  var passbook_change_type = function(event) {
    event.data.type = $(event.currentTarget).attr('name');
  }

  var passbook_picker_toggle = function(event) {
    if (event.target != event.currentTarget) return;
    
    var passbook = event.data;
    var $container = passbook.$container;
    var $picker = $($container.find('.passbook-picker'));
    
    if ($picker.css('display') != 'none') {
      $picker.removeAttr('style')
                    .off('click')
                  .empty();
      return;
    }

    $picker.on('click', event.data, passbook_picker_toggle)
    var r, g, b, k;
    var _change_color = function(event) {
      var passbook = event.data;
      var rb = Math.round(r.getValue());
      var gb = Math.round(g.getValue());
      var bb = Math.round(b.getValue());
      var shading = (k.getValue() - 128) / 128;
      passbook.color = 'rgb(' + rb + "," + gb + "," + bb + ")";
      passbook.shading = (k.getValue() - 128) / 128;
    }
    
    var components = passbook.color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    var rc = Number(components[1]);
    var gc = Number(components[2]);
    var bc = Number(components[3]);
    var kc = passbook.shading + 0.5 * 128;

    var id = Math.floor(Math.random() * 999999);
    $picker.css('display', 'block')
             .append($('<div class="passbook-picker-contents">')
               .append($('<div class="btn-group" style="margin-bottom: 8px;">')
                 .append($('<button class="btn btn-default btn-xs" data-toggle="tooltip" data-original-title="Boarding&nbsp;Pass" name="boarding-pass"><i class="fa fa-plane fa-lg"/></button>'))
                 .append($('<button class="btn btn-default btn-xs" data-toggle="tooltip" data-original-title="Coupon" name="coupon"><i class="fa fa-money fa-lg"/></button>'))
                 .append($('<button class="btn btn-default btn-xs" data-toggle="tooltip" data-original-title="Event" name="event"><i class="fa fa-calendar fa-lg"/></button>'))
                 .append($('<button class="btn btn-default btn-xs" data-toggle="tooltip" data-original-title="Store&nbsp;Card" name="store-card"><i class="fa fa-credit-card fa-lg"/></button>'))
                 .append($('<button class="btn btn-default btn-xs" data-toggle="tooltip" data-original-title="Generic&nbsp;Pass" name="generic"><i class="fa fa-ticket fa-lg"/></button>'))
               ) // </div class="btn-group">
               .append($('<div class="slider-r"><input type="text" class="passbook-slider" value="0" zdata-slider-id="r' + id + '" data-slider-min="0" data-slider-max="255" data-slider-step="1" data-slider-value="' + rc + '" data-slider-tooltip="hide"></div>'))
               .append($('<div class="slider-g"><input type="text" class="passbook-slider" value="0" zdata-slider-id="g' + id + '" data-slider-min="0" data-slider-max="255" data-slider-step="1" data-slider-value="' + gc + '" data-slider-tooltip="hide"></div>'))
               .append($('<div class="slider-b"><input type="text" class="passbook-slider" value="0" zdata-slider-id="b' + id + '" data-slider-min="0" data-slider-max="255" data-slider-step="1" data-slider-value="' + bc + '" data-slider-tooltip="hide"></div>'))
               .append($('<div class="slider-k"><input type="text" class="passbook-slider" value="0" zdata-slider-id="k' + id + '" data-slider-min="0" data-slider-max="255" data-slider-step="1" data-slider-value="' + kc + '" data-slider-tooltip="hide"></div>'))
             ) // </div class="passbook-picker-contents">

    /* Enable sliders and tooltips */
    $picker.find('.passbook-slider').slider();
    $picker.find('button').tooltip({container: $picker}).on('click', passbook, passbook_change_type);

    r = $picker.find('div.slider-r input.passbook-slider').on('slide', event.data, _change_color).data('slider')
    g = $picker.find('div.slider-g input.passbook-slider').on('slide', event.data, _change_color).data('slider')
    b = $picker.find('div.slider-b input.passbook-slider').on('slide', event.data, _change_color).data('slider')
    k = $picker.find('div.slider-k input.passbook-slider').on('slide', event.data, _change_color).data('slider')
  }

  var transport_toggle = function(event) {
    var passbook = event.data;
    var transport = passbook.transport;

    if        (transport == TRANSPORT_AIR) {
      passbook.transport =  TRANSPORT_BOAT;
    } else if (transport == TRANSPORT_BOAT) {
      passbook.transport =  TRANSPORT_BUS;
    } else if (transport == TRANSPORT_BUS) {
      passbook.transport =  TRANSPORT_TRAIN;
    } else if (transport == TRANSPORT_TRAIN) {
      passbook.transport =  TRANSPORT_GENERIC;
    } else if (transport == TRANSPORT_GENERIC) {
      passbook.transport =  TRANSPORT_AIR;
    }
  }

  /* ======================================================================== */
  /* THUMBNAIL AND IMAGE PASTING                                              */
  /* ======================================================================== */
  
  var read_image = function(event) {

    /* Check if we have something to load */
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    if ((!items) || (!items[0])) {
      console.warn('No items to load');
      return;
    }

    /* Check we have an image */
    if (!items[0].type.match(/image\//)) {
      console.warn('Cannot load type ' + items[0].type);
      return;
    }

    /* Load the "file" as a data URL */
    $(new FileReader()).on('load', event.data, function(event) {

      /* Create an image from the contents */
      $(new Image()).on('load', event.data, function(event) {
        var width = this.width;
        var height = this.height;
        var data = this.src;
        
        /* We might have to rescale the image */
        if (event.data.size) {
          if ((width > event.data.size[0]) || (height > event.data.size[1])) {
            var stretchX = event.data.size[0] / width;
            var stretchY = event.data.size[1] / height;
            if (stretchY < stretchX) stretchX = stretchY;
            if (stretchX < stretchY) stretchY = stretchX;
            width = Math.floor(width * stretchX);
            height = Math.floor(height * stretchY);
            console.log('Rescaling to ' + width + 'x' + height);
          }

          /* Use a canvas to resize the image */
          var canvas = $('<canvas/>').attr({ width: width, height: height })[0];
          var context = canvas.getContext('2d');
          context.drawImage(this, 0, 0, width, height);
          data = canvas.toDataURL();
        }

        /* Slap the thumbnail as a background source for the target */
        if (event.data.handler) event.data.handler({ width: width, height: height, data: data});

        /* Trigger loading of the image source */
      })[0].src = event.target.result;
      
      /* Trigger reading the pasted item */
    })[0].readAsDataURL(items[0].getAsFile());
  }
  
  var thumbnail_shown = function(event) {
    var passbook = event.data;

    /* A handler to slap the image in the thumbnail */
    var handler = function(image) {
      var target = passbook.$container.find('.passbook-thumbnail');
      var background = 'url(' + image.data + ')';
      target.css({ width: image.width,
                   height: image.height,
                   background: 'url(' + image.data + ')' })
       .addClass('passbook-has-image')
        .popover('hide')
           .next('.popover').css('display', 'none');
    }

    /* Trigger our handler on paste */
    $(document).on('paste', { passbook: passbook, size: [90, 90], handler: handler }, read_image);
  }

  var thumbnail_hidden = function(event) {
    $(document).off('paste');
  }

  var logo_shown = function(event) {
    var passbook = event.data;

    /* A handler to slap the image in the thumbnail */
    var handler = function(image) {
      var target = passbook.$container.find('.passbook-logo');
      var background = 'url(' + image.data + ')';
      target.css({ width: image.width,
                   height: image.height,
                   background: 'url(' + image.data + ')' })
       .addClass('passbook-has-image')
        .popover('hide')
           .next('.popover').css('display', 'none');
    }

    /* Trigger our handler on paste */
    $(document).on('paste', { passbook: passbook, size: [160, 50], handler: handler }, read_image);
  }

  var logo_hidden = function(event) {
    $(document).off('paste');
  }
  
  var clear_image = function(event) {
    var image = $(event.target).parent('.passbook-has-image');
    image.removeAttr('style').removeClass('passbook-has-image');
    event.preventDefault();
    event.stopPropagation();
  }

  /* ======================================================================== */
  /* CONSTRUCTOR                                                              */
  /* ======================================================================== */

  var Passbook = function (element) {
    this.$container = $($('<div class="passbook-container"/>'))
                  .append($('<div class="passbook-flipper"/>')
                    .append($('<div class="passbook-front passbook-color"/>')
                      .append($('<div class="passbook-picker"/>'))
                      .append($('<table class="passbook-header">')
                        .append($('<tr>')
                          .append($('<td rowspan="2" class="passbook-logo"/>')
                            .append($('<div class="passbook-clear"/>'))
                          ) // <td rowspan="2" class="passbook-logo"/>
                          .append($('<th rowspan="2" class="passbook-title"/>'))
                          .append($('<th class="passbook-header-label"/>'))
                        ) // </tr>
                        .append($('<tr>')
                          .append($('<th class="passbook-header-value"/>'))
                        ) //</tr>
                      ) // </table class="passbook-header">
                      .append($('<div class="passbook-thumbnail">')
                        .append($('<div class="passbook-clear"/>'))
                      ) // </div class="passbook-thumbnail">
                      .append($('<div class="passbook-transport passbook-shading"/>'))
                      .append($('<table class="passbook-primary">')
                        .append($('<thead>')
                          .append($('<tr>')
                            .append($('<th class="passbook-primary-label-1"/>'))
                            .append($('<th class="passbook-primary-label-2"/>'))
                          ) // </tr>
                        ) //</thead>
                        .append($('<tbody>')
                          .append($('<tr>')
                            .append($('<td class="passbook-primary-value-1"/>'))
                            .append($('<td class="passbook-primary-value-2"/>'))
                          ) // </tr>
                        ) // </tbody>
                      ) // </table class="passbook-primary">
                      .append($('<table class="passbook-extra-fields passbook-auxiliary">')
                        .append($('<div class="passbook-add"/>').on('click', this, _add_empty_extra_fields))
                        .append($('<tr><th/></tr>'))
                        .append($('<tr><td/></tr>'))
                      ) //</table class="... passbook-auxiliary">
                      .append($('<table class="passbook-extra-fields passbook-secondary">')
                        .append($('<div class="passbook-add"/>').on('click', this, _add_empty_extra_fields))
                        .append($('<tr><th/></tr>'))
                        .append($('<tr><td/></tr>'))
                      ) //</table class="... passbook-secondary">
                      .append($('<div class="passbook-barcode"/>'))
                      .append($('<div class="passbook-moreinfo"/>').on('click', this, _flip))
                      .append($('<div class="passbook-editsave"/>').on('click', this, _edit_save))
                    ) // </div class="passbook-front">
                    .append($('<div class="passbook-back passbook-color"/>')
                      .append($('<div class="passbook-done"/>').on('click', this, _flip))
                      .append($('<div class="passbook-back-fields">')
                        .append($('<table/>'))
                        .append($('<div class="passbook-add"/>').on('click', this, _add_empty_back_fields))
                      ) // </div class="passbook-back-fields">
                    ) // </div class="passbook-back">
                  ) // </div class="passbook-flipper">
                ; // </div class="passbook-container">

    /* Other initialization, after the HTML is done, */
    var $element = $(element);
    $element.append(this.$container);
    
    /* Current properties */
    this.type        = $element.data('passbook-type')      || TYPE_GENERIC;
    this.transport   = $element.data('passbook-transport') || TRANSPORT_GENERIC;
    this.barcode     = '';
    this.barcodeType = '';
  }


  /* ======================================================================== */
  /* CONSTANTS                                                                */
  /* ======================================================================== */

  Object.defineProperty(Passbook.prototype, 'TYPE_BOARDING_PASS', { value: TYPE_BOARDING_PASS });
  Object.defineProperty(Passbook.prototype, 'TYPE_COUPON',        { value: TYPE_COUPON });
  Object.defineProperty(Passbook.prototype, 'TYPE_EVENT',         { value: TYPE_EVENT });
  Object.defineProperty(Passbook.prototype, 'TYPE_STORE_CARD',    { value: TYPE_STORE_CARD });
  Object.defineProperty(Passbook.prototype, 'TYPE_GENERIC',       { value: TYPE_GENERIC });

  Object.defineProperty(Passbook.prototype, 'TRANSPORT_AIR',      { value: TRANSPORT_AIR });
  Object.defineProperty(Passbook.prototype, 'TRANSPORT_BOAT',     { value: TRANSPORT_BOAT });
  Object.defineProperty(Passbook.prototype, 'TRANSPORT_BUS',      { value: TRANSPORT_BUS });
  Object.defineProperty(Passbook.prototype, 'TRANSPORT_TRAIN',    { value: TRANSPORT_TRAIN });
  Object.defineProperty(Passbook.prototype, 'TRANSPORT_GENERIC',  { value: TRANSPORT_GENERIC });


  /* ======================================================================== */
  /* FUNCTIONS                                                                */
  /* ======================================================================== */

  Passbook.prototype.edit = function() {
    /* Check if we're editing */
    if (this.mode == 'edit') return;
  
    /* Trim all the content */
    this.$container.find('th,td').not('.passbook-logo')
                   .attr('contenteditable', true)
                     .on('blur', this, _content_edited);
    
    /* Remove extra fields when empty */
    this.$container.find('.passbook-extra-fields [contenteditable]')
                     .on('blur', this, _remove_empty_extra_fields);
    this.$container.find('.passbook-back-fields [contenteditable]')
                     .on('blur', this, _remove_empty_back_fields);
    
    /* Popover for barcode */
    this.$container.find('.passbook-barcode')
                     .on('shown.bs.popover', this, barcode_shown)
                .popover({ animation: false,
                           html: true,
                           placement: 'top',
                           trigger: 'click',
                           title: 'Barcode contents',
                           content: barcode_popover });

    /* Popover for thumbnail */
    this.$container.find('.passbook-thumbnail')
                     .on('shown.bs.popover', this, thumbnail_shown)
                     .on('hidden.bs.popover', this, thumbnail_hidden)
                .popover({ animation: false,
                           html: false,
                           placement: 'left',
                           trigger: 'click',
                           content: 'Paste a logo' });

    /* Popover for thumbnail */
    this.$container.find('.passbook-logo')
                     .on('shown.bs.popover', this, logo_shown)
                     .on('hidden.bs.popover', this, logo_hidden)
                .popover({ animation: false,
                           html: false,
                           placement: 'right',
                           trigger: 'click',
                           content: 'Paste a thumbnail' });

    /* Other editors for colors, type, transport... */
    this.$container.find('.passbook-front').on('click', this, passbook_picker_toggle);
    this.$container.find('.passbook-transport').on('click', this, transport_toggle);
    this.$container.find('.passbook-clear').on('click', this, clear_image);
    
    /* Class marker */
    this.$container.addClass('passbook-edit');
  }
  
  Passbook.prototype.save = function() {
    /* Check if we're editing */
    if (this.mode != 'edit') return;
    
    this.$container.find('[contenteditable]')
             .removeAttr('contenteditable')
                    .off('blur');
    this.$container.removeClass('passbook-edit');
    this.$container.find('.passbook-barcode')
                    .off('shown.bs.popover')
                .popover('destroy');
    this.$container.find('.passbook-thumbnail')
                    .off('shown.bs.popover')
                .popover('destroy');
    this.$container.find('.passbook-logo')
                    .off('shown.bs.popover')
                .popover('destroy');

    this.$container.find('.passbook-front').off('click');
    this.$container.find('.passbook-transport').off('click');

    this.$container.find('.passbook-picker')
             .removeAttr('style')
                  .empty();
  }
  
  Passbook.prototype.flip = function() {
    this.$container.toggleClass('passbook-flipped');
  }

  /* ======================================================================== */
  /* PROPERTIES                                                               */
  /* ======================================================================== */

  Object.defineProperty(Passbook.prototype, "type", {
      get: function () {
        if (this.$container.hasClass(TYPE_BOARDING_PASS_C)) return TYPE_BOARDING_PASS;
        if (this.$container.hasClass(TYPE_COUPON_C))        return TYPE_COUPON;
        if (this.$container.hasClass(TYPE_EVENT_C))         return TYPE_EVENT;
        if (this.$container.hasClass(TYPE_STORE_CARD_C))    return TYPE_STORE_CARD;
        return TYPE_GENERIC;
      },
      set: function(value) {
        var cls;
        if      (value == TYPE_BOARDING_PASS) cls = TYPE_BOARDING_PASS_C;
        else if (value == TYPE_COUPON)        cls = TYPE_COUPON_C;
        else if (value == TYPE_EVENT)         cls = TYPE_EVENT_C;
        else if (value == TYPE_STORE_CARD)    cls = TYPE_STORE_CARD_C;
        else if (value == TYPE_GENERIC)       cls = null;
        else throw ('Unsupported passbook type "' + value + '"');

        this.$container.removeClass(TYPE_C);
        if (cls != null) this.$container.addClass(cls);
      }
  });

  Object.defineProperty(Passbook.prototype, "transport", {
      get: function () {
        /* Transport available only in boarding passes */
        if (!this.$container.hasClass(TYPE_BOARDING_PASS_C)) return null;

        /* Transport available only in boarding passes */
        if (this.$container.hasClass(TRANSPORT_AIR_C))   return this.TRANSPORT_AIR;
        if (this.$container.hasClass(TRANSPORT_BOAT_C))  return this.TRANSPORT_BOAT;
        if (this.$container.hasClass(TRANSPORT_BUS_C))   return this.TRANSPORT_BUS;
        if (this.$container.hasClass(TRANSPORT_TRAIN_C)) return this.TRANSPORT_TRAIN;
        return TRANSPORT_GENERIC;
      },
      set: function(value) {
        var cls;
        if      (value == TRANSPORT_AIR)     cls = TRANSPORT_AIR_C;
        else if (value == TRANSPORT_BOAT)    cls = TRANSPORT_BOAT_C;
        else if (value == TRANSPORT_BUS)     cls = TRANSPORT_BUS_C;
        else if (value == TRANSPORT_TRAIN)   cls = TRANSPORT_TRAIN_C;
        else if (value == TRANSPORT_GENERIC) cls = null;
        else throw ('Unsupported transport type "' + value + '"');
        
        /* Set the class irregardless of pass type */
        this.$container.removeClass(TRANSPORT_C);
        if (cls != null) this.$container.addClass(cls);
      }
  });

  Object.defineProperty(Passbook.prototype, "color", {
      get: function () {
        return this.$container.find('.passbook-color').css('background-color');
      },
      set: function (color) {
        color = $('<div style="color:' + color + '"/>').css('color');
        if ((color == null) || (color == '')) return;
        this.$container.find('.passbook-color').css('background-color', color);
      }
  });

  Object.defineProperty(Passbook.prototype, "shading", {
      get: function () {
        var shading = this.$container.find('.passbook-shading').css('opacity');
        shading = Math.round(((Number(shading) / 2) * 3) * 100) / 100;
        if (shading < 0) shading = 0;
        else if (shading > 1) shading = 1;
        return this.$container.hasClass('passbook-white') ? shading : -shading;
      },
      set: function (shading) {
        if (shading < 0) {
          shading = -shading;
          this.$container.removeClass('passbook-white');
          this.$container.find('.passbook-color').css('color', 'rgba(0,0,0,' + shading + ')');
          this.$container.find('.passbook-shading').css('opacity', shading / 3 * 2);
        } else {
          this.$container.addClass('passbook-white');
          this.$container.find('.passbook-color').css('color', 'rgba(255,255,255,' + shading + ')');
          this.$container.find('.passbook-shading').css('opacity', shading / 3 * 2);
        }
      }
  });

  Object.defineProperty(Passbook.prototype, "foreground", {
    get: function () {
      /* Get (and parse) the color */
      var color = this.color;
      var matches = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(color);
      if (matches == null) throw 'Invalid color ' + color + ' found???';
      var r = Number(matches[1]);
      var g = Number(matches[2]);
      var b = Number(matches[3]);

      /* Get the shading (alpha) and calculate */
      var shading = this.shading;
      var rf, gf, bf;
      if (shading < 0) {
        shading = - shading;
        rf = Math.round(0 * shading + r * (1 - shading));
        gf = Math.round(0 * shading + g * (1 - shading));
        bf = Math.round(0 * shading + b * (1 - shading));
      } else {
        rf = Math.round(255 * shading + rb * (1 - shading));
        gf = Math.round(255 * shading + gb * (1 - shading));
        bf = Math.round(255 * shading + bb * (1 - shading));
      }

      /* Build CSS color and return */
      return 'rgb(' + rf + ", " + gf + ", " + bf + ")";
    },
    set: function () {
      throw 'Foreground is a read-only property';
    }
  });

  Object.defineProperty(Passbook.prototype, "mode", {
    get: function () {
      if (this.$container.hasClass('passbook-edit')) {
        return 'edit';
      } else {
        return 'view';
      }
    },
    set: function () {
      throw 'Mode is a read-only property';
    }
  });

  /* ======================================================================== */
  /* JQUERY INTEGRATION                                                       */
  /* ======================================================================== */

  /* Initialize a "Passbook" object and structure */
  $.fn.passbook = function (option) {
    var returnValue = null;
    var eachReturnValue = this.each(function() {
      var $this = $(this);
      var data = $this.data('passbook');

      if (!data) {
        data = $this.data('passbook', (data = new Passbook($this)));
      }
      
      if (option == 'edit') data.edit();
      if (option == 'save') data.save();
      if (option == 'flip') data.flip();
      if ((option == 'data') && (!returnValue)) returnValue = data;
    });
    return returnValue || eachReturnValue;
  }

}(jQuery);