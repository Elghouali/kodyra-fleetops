/** Actual model photographs from Wikimedia Commons, CC0/public-domain dedicated source files.
 * Photos are *representative*, and are not photos of any real demo inventory.
 * Attribution/reference list: docs/VEHICLE_PHOTOGRAPHY.md
 */
export const DEMO_PHOTOS = Object.freeze({
  "V01": {
    "model": "Dacia Duster",
    "file": "Dacia Duster II 083847.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Dacia_Duster_II_083847.jpg",
    "license": "CC0 1.0"
  },
  "V02": {
    "model": "Renault Clio 5",
    "file": "Renault Clio V (48220140307).jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Renault_Clio_V_(48220140307).jpg",
    "license": "CC0 1.0"
  },
  "V03": {
    "model": "Hyundai Tucson",
    "file": "Hyundai Tucson 2021 blanco.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Hyundai_Tucson_2021_blanco.jpg",
    "license": "CC0 1.0"
  },
  "V04": {
    "model": "Peugeot 208",
    "file": "Peugeot 208 194922.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Peugeot_208_194922.jpg",
    "license": "CC0 1.0"
  },
  "V05": {
    "model": "Volkswagen Golf 8",
    "file": "Volkswagen Golf VIII 1.5 eTSI (2025) (55076713814).jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_VIII_1.5_eTSI_(2025)_(55076713814).jpg",
    "license": "CC0 1.0"
  },
  "V06": {
    "model": "Kia Sportage",
    "file": "Kia Sportage (NQ5) 1758033820001.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kia_Sportage_(NQ5)_1758033820001.jpg",
    "license": "CC0 1.0"
  },
  "V07": {
    "model": "Toyota Yaris",
    "file": "2021 Toyota Yaris in Silver Metallic, front right, 06-05-2025.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:2021_Toyota_Yaris_in_Silver_Metallic,_front_right,_06-05-2025.jpg",
    "license": "CC0 1.0"
  },
  "V08": {
    "model": "Mercedes C-Class",
    "file": "Silver Mercedes-Benz C-Class (W205) saloon parked outside Pioneer Wharf, Chatham.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Silver_Mercedes-Benz_C-Class_(W205)_saloon_parked_outside_Pioneer_Wharf,_Chatham.jpg",
    "license": "CC0 1.0"
  },
  "V09": {
    "model": "Skoda Octavia",
    "file": "Škoda Octavia 1.5 TSI (2024) (54724554757).jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Škoda_Octavia_1.5_TSI_(2024)_(54724554757).jpg",
    "license": "CC0 1.0"
  },
  "V10": {
    "model": "Citroën C3",
    "file": "Citroën C3 1.2 PureTech 110 (2023) (54741087572).jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Citroën_C3_1.2_PureTech_110_(2023)_(54741087572).jpg",
    "license": "CC0 1.0"
  }
});
export function demoVehiclePhoto(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return null;
  const sample=DEMO_PHOTOS[vehicle.id];
  if (!sample || vehicle.make + " " + vehicle.model !== sample.model) return null;
  const encoded=encodeURIComponent(sample.file.replaceAll(" ", "_"));
  return {src:`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=960`,source:sample.source,license:sample.license};
}
