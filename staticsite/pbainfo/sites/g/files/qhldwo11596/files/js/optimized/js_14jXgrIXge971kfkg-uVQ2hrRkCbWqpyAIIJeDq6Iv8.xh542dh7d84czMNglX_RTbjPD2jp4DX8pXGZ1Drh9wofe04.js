/**
 * @file
 * Dialog initialization for mail preview.
 */

(function ($, Drupal, drupalSettings, once) {
  'use strict';
  var $window = $(window);

  Drupal.behaviors.externalLinkPopup = {
    attach: function (context) {
      var self = this;
      var settings = drupalSettings.external_link_popup;

      if (
        !settings.popups
        || !settings.popups.length
        || !$(once('external-link-popup', 'body', context)).length
      ) {
        return;
      }

      // RegExp /\s*,\s*|\s+/ supports both space and comma delimiters
      // and its combination.
      var whitelist = settings.whitelist ? settings.whitelist.split(/\s*,\s*|\s+/) : [];
      var current = window.location.host || window.location.hostname;
      var popup;

      whitelist.unshift(current);
      if (current.substr(0, 4) === 'www.') {
        whitelist.push(current.substr(4));
      }
      else {
        whitelist.push('www.' + current);
      }

      // $.once checked above.
      $('body', context).on('click', 'a', function (e) {
        var element = $(this).get(0);
        var popupId = element.getAttribute('data-external-link-popup-id');
        var domain = self.getDomain(element.getAttribute('href'));
        if (!domain && !popupId) {
          // It's internal link, return without events.
          return;
        }
        if (
          $(element).hasClass('external-link-popup-disabled') ||
          !popupId &&
          self.inDomain(domain, whitelist)
        ) {
          $window.trigger({
            type: 'externalLinkPopup:skipped',
            popupId: null,
            domain: domain,
            target: element
          });
          return;
        }

        for (var i = 0; i < settings.popups.length; i++) {
          popup = settings.popups[i];
          if (!popupId && popup.domains !== '*' && !self.inDomain(domain, popup.domains.split(/\s*,\s*|\s+/))) {
            continue;
          }
          if (popupId && popupId !== popup.id) {
            continue;
          }
          e.preventDefault();
          return self.openDialog(
            element,
            popup,
            domain
          );
        }

        $window.trigger({
          type: 'externalLinkPopup:notFound',
          popupId: null,
          domain: domain,
          target: element
        });
      });
    },
    inDomain: function (domain, domains) {
      if (typeof domain !== 'string') {
        return false;
      }
      for (var i in domains) {
        if (
          domain.toLowerCase() === domains[i].toLowerCase() ||
          domain.match(new RegExp('\\.' + this.pregEscape(domains[i]) + '$', 'i'))
        ) {
          return true;
        }
      }
      return false;
    },
    getDomain: function (url) {
      if (typeof url !== 'string') {
        return null;
      }
      var matches = url.match(/\/\/([^/]+)\/?/);
      return matches && matches[1];
    },
    pregEscape: function (str) {
      return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&');
    },
    openDialog: function (element, popup, domain) {
      var dialog;
      var yes = false;
      var body = document.createElement('div');
      var content = document.createElement('div');
      var options = {
        title: popup.title,
        width: drupalSettings.external_link_popup.width || '85%',
        buttons: [
          {
            text: popup.labelyes,
            click: function () {
              yes = true;
              $(this).dialog('close');
              $window.trigger({
                type: 'externalLinkPopup:yes',
                popupId: popup.id,
                domain: domain,
                target: element
              });
              var target = window.open(element.href, element.target || popup.target);
              target.focus();
            }
          }
        ],
        create: function () {
          var $widget = $(this).parent();

          if (!$widget.length) {
            // Bootstrap theme modal.
            $widget = $('.modal-dialog', this);
          }
          $widget.addClass('external-link-popup')
            .addClass('external-link-popup-id-' + popup.id.replace('_', '-'));
          if (!popup.close) {
            $widget.find('.ui-dialog-titlebar-close').remove();
          }
          if (!popup.title && !popup.close) {
            $widget.find('.ui-dialog-titlebar').remove();
          }
        },
        close: function () {
          var $element = $(this);
          if (dialog && dialog.open) {
            dialog.close();
          }
          $element.dialog('destroy');
          if (!yes) {
            $window.trigger({
              type: 'externalLinkPopup:no',
              popupId: popup.id,
              domain: domain,
              target: element
            });
          }
        }
      };
      if (popup.labelno) {
        options.buttons.push({
          text: popup.labelno,
          click: function () {
            $(this).dialog('close');
          }
        });
      }

      // Take care about tokens.
      var url = $(element).attr('href');
      var text = $(element).text();
      var bodyHtml = popup.body
        .replace('[link:url]', this.htmlEncode(url))
        .replace('[link:text]', this.htmlEncode(text));

      content.className = 'external-link-popup-content';
      body.innerHTML = bodyHtml;
      body.className = 'external-link-popup-body';
      content.appendChild(body);

      dialog = Drupal.dialog(content, options);
      dialog.showModal();
    },
    htmlEncode: function (value) {
      return $('<div/>').text(value).html();
    }
  };
})(jQuery, Drupal, drupalSettings, once);
