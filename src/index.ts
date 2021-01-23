import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from "homebridge";

import subMinutes from "date-fns/subMinutes";
import debounce from "lodash.debounce";
import { hsvToRgb, rgbToHsv } from "./hsvUtils";

import got from "got";

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;

  api.registerAccessory("RubetekBulb", RubetekBulb);
};

class RubetekBulb implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly deviceID: string;
  private readonly houseID: string;
  private readonly username: string;
  private readonly password: string;

  private switchOnCache = false;

  private hCache = 0;
  private sCache = 0;
  private bCache = 0;

  private cacheLastUpdated = new Date(0);

  private readonly switchService: Service;
  private readonly informationService: Service;

  isCacheExpired(): boolean {
    return subMinutes(new Date(), 5) > this.cacheLastUpdated;
  }

  async refreshCache(): Promise<void> {
    const { houses } = await got(`https://ccc.rubetek.com/v2/houses`, {
      username: this.username,
      password: this.password,
    }).json();

    const traits = houses
      .find(({ id }) => id.toString(10) === this.houseID)
      .devices.find(({ id }) => id === this.deviceID).currentState;

    const [hue, saturation] = rgbToHsv(
      traits["lamp:R[0]"] || 0,
      traits["lamp:G[0]"] || 0,
      traits["lamp:B[0]"] || 0
    );

    this.hCache = hue;
    this.sCache = saturation;
    this.bCache = traits["lamp:brightness[0]"];
    this.switchOnCache = traits["lamp:on[0]"];
    this.cacheLastUpdated = new Date();
  }

  async setTraits(traits): Promise<void> {
    await got(
      `https://ccc.rubetek.com/projects/${this.houseID}/devices/${this.deviceID}/parameters/`,
      {
        method: "POST",
        username: this.username,
        password: this.password,
        json: traits,
      }
    );
  }

  async updateLight() {
    const [r, g, b] = hsvToRgb(this.hCache, this.sCache, 0.5);

    this.log.debug(JSON.stringify({ r, g, b }));

    await this.setTraits({
      "lamp:R[0]": Math.floor(r),
      "lamp:G[0]": Math.floor(g),
      "lamp:B[0]": Math.floor(b),
    });
  }

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.deviceID = config.deviceID as string;
    this.houseID = config.houseID as string;
    this.username = config.username as string;
    this.password = config.password as string;

    this.switchService = new hap.Service.Lightbulb(this.name);
    this.switchService
      .getCharacteristic(hap.Characteristic.On)
      .on(
        CharacteristicEventTypes.GET,
        async (callback: CharacteristicGetCallback) => {
          if (this.isCacheExpired()) {
            await this.refreshCache();
          }
          callback(undefined, this.switchOnCache);
        }
      )
      .on(
        CharacteristicEventTypes.SET,
        async (
          value: CharacteristicValue,
          callback: CharacteristicSetCallback
        ) => {
          this.switchOnCache = value as boolean;

          await this.setTraits({
            "lamp:on[0]": this.switchOnCache,
          });

          callback();
        }
      );

    this.switchService
      .getCharacteristic(hap.Characteristic.Hue)
      .on(
        CharacteristicEventTypes.GET,
        async (callback: CharacteristicGetCallback) => {
          if (this.isCacheExpired()) {
            await this.refreshCache();
          }
          callback(undefined, this.hCache * 360);
        }
      )
      .on(
        CharacteristicEventTypes.SET,
        async (
          value: CharacteristicValue,
          callback: CharacteristicSetCallback
        ) => {
          this.hCache = (value as number) / 360;

          await debounce(this.updateLight, 300);

          callback();
        }
      );

    this.switchService
      .getCharacteristic(hap.Characteristic.Saturation)
      .on(
        CharacteristicEventTypes.GET,
        async (callback: CharacteristicGetCallback) => {
          if (this.isCacheExpired()) {
            await this.refreshCache();
          }
          callback(undefined, this.sCache * 100);
        }
      )
      .on(
        CharacteristicEventTypes.SET,
        async (
          value: CharacteristicValue,
          callback: CharacteristicSetCallback
        ) => {
          this.sCache = (value as number) / 100;

          await debounce(this.updateLight, 300);

          callback();
        }
      );

    this.switchService
      .getCharacteristic(hap.Characteristic.Brightness)
      .on(
        CharacteristicEventTypes.GET,
        async (callback: CharacteristicGetCallback) => {
          if (this.isCacheExpired()) {
            await this.refreshCache();
          }
          callback(undefined, this.bCache);
        }
      )
      .on(
        CharacteristicEventTypes.SET,
        async (
          value: CharacteristicValue,
          callback: CharacteristicSetCallback
        ) => {
          this.bCache = value as number;

          await this.setTraits({
            "lamp:brightness[0]": this.bCache,
          });

          callback();
        }
      );

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Rubetek")
      .setCharacteristic(hap.Characteristic.Model, "Lighbulb");

    log.info("Switch finished initializing!");
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.switchService];
  }
}
