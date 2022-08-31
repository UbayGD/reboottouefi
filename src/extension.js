/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { Gio, Clutter, St, Pango } = imports.gi;
const Main = imports.ui.main;
const { panel } = Main;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;
const ModalDialog = imports.ui.modalDialog;
const Lang = imports.lang;

const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

const ManagerInterface = `<node>
  <interface name="org.freedesktop.login1.Manager">
    <method name="SetRebootToFirmwareSetup">
      <arg type="b" direction="in"/>
    </method>
    <method name="Reboot">
      <arg type="b" direction="in"/>
    </method>
  </interface>
</node>`;
const Manager = Gio.DBusProxy.makeProxyWrapper(ManagerInterface);

class Extension {
  #systemIndicator
  #proxy;
  #rebootToUefiItem;
  #counter;
  #seconds;
  #counterIntervalId;
  #messageIntervalId;

  constructor() {
    this.#systemIndicator = panel.statusArea.aggregateMenu._system;
  }

  enable() {
    this.#proxy = new Manager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');

    this.#rebootToUefiItem = new PopupMenu.PopupImageMenuItem(`${_('Restart to UEFI')}...`, '');
    this.#rebootToUefiItem.connect('activate', () => {
      this.#counter = 60;
      this.#seconds = this.#counter;

      const dialog = this._buildDialog();
      dialog.open();

      this.#counterIntervalId = setInterval(() => {
        if (this.#counter > 0) {
          this.#counter--;
          if (this.#counter % 10 === 0) {
            this.#seconds = this.#counter;
          }
        } else {
          this._clearIntervals();
          this._reboot();
        }
      }, 1000);

    });

    this.#systemIndicator._sessionSubMenu.menu.addMenuItem(this.#rebootToUefiItem, 2);
  }

  disable() {
    this.#rebootToUefiItem.destroy();
    this.#rebootToUefiItem = null;
    this.#proxy = null;
  }

  _reboot() {
    this.#proxy.SetRebootToFirmwareSetupRemote(true);
    this.#proxy.RebootRemote(false);
  }

  _buildDialog() {
    const dialog = new ModalDialog.ModalDialog({styleClass: "modal-dialog"});
    dialog.setButtons([
      {
        label: _("Cancel"),
        action: Lang.bind(dialog, () => {
          this._clearIntervals();
          dialog.close();
        }),
        key: Clutter.KEY_Escape,
        default: false,
      },
      {
        label: _("Restart"),
        action: Lang.bind(dialog, () => {
          this._clearIntervals();
          this._reboot();
        }),
        default: false,
      },
    ]);

    const dialogTitle = new St.Label({
      text: _('Restart to UEFI'),
      // style_class: 'dialog-title' // TODO investigate why css classes are not working
      style: "font-weight: bold;font-size:18px"
    });

    let dialogMessage = new St.Label({
      text: this._getDialogMessageText(),
    });
    dialogMessage.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    dialogMessage.clutter_text.line_wrap = true;

    const titleBox = new St.BoxLayout({
      x_align: Clutter.ActorAlign.CENTER,
    });
    titleBox.add(new St.Label({ text: '  ' }));
    titleBox.add(dialogTitle);

    let box = new St.BoxLayout({ y_expand: true, vertical: true });
    box.add(titleBox);
    box.add(new St.Label({ text: '  ' }));
    box.add(dialogMessage);

    this.#messageIntervalId = setInterval(() => {
      dialogMessage?.set_text(this._getDialogMessageText());
    }, 500);

    dialog.contentLayout.add(box);

    return dialog;
  }

  _getDialogMessageText() {
    return _(`The system will restart automatically in %d seconds.`).replace('%d', this.#seconds);
  }

  _clearIntervals() {
    clearInterval(this.#counterIntervalId);
    clearInterval(this.#messageIntervalId);
  }

}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new Extension();
}
