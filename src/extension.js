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

const { Gio } = imports.gi;
const Main = imports.ui.main;
const { panel } = Main;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;

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

  constructor() {
    this.#systemIndicator = panel.statusArea.aggregateMenu._system;
  }

  enable() {
    this.#proxy = new Manager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');

    this.#rebootToUefiItem = new PopupMenu.PopupImageMenuItem(_('Restart to UEFI'), '');
    this.#rebootToUefiItem.connect('activate', () => {
      this._reboot();
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
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new Extension();
}
