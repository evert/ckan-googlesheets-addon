var SIDEBAR_TITLE = 'CKAN Data Explorer';
var CACHE_PERIOD = 300; // cache for 5 minutes

var packageCache = null;
var lastProviderUrl = null;

var providers = [
  {
    url: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3',
    title: 'City of Toronto',
  },
  {
    url: 'http://data.ottawa.ca/api/3',
    title: 'Ottawa',
  },
  {
    url: 'https://data.ontario.ca/api/3/',
    title: 'Ontario',
  },
  {
    url: 'https://data.canada.ca/api/3/',
    title: 'Canada',
  }

];



/**
 * Adds a custom menu with items to show the sidebar
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
  .createAddonMenu()
  .addItem('Open', 'showSidebar')
  .addToUi();
}

/**
 * Show the side bar
 */
function showSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle(SIDEBAR_TITLE)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(ui);

}

function getProviderList() {
  return providers;
}

/**
 * Returns the list of package ids with a given provider url
 *
 * @param {String} providerUrl
 * @returns {String[]}
 */
function getPackageList(providerUrl) {

  return loadPackageList(providerUrl);

}

function getPackageInfoByName(providerUrl, name) {

  Logger.log([providerUrl, name]);

  loadPackageList(providerUrl);
  Logger.log(packageCache[name]);
  if (!packageCache[name]) {
    throw new Error('Could not find package with name ' + name + ' for provider ' + providerUrl);
  }

  return packageCache[name];
}

/**
 * Import all the data with CSV format, create a new sheet for each data set
 * @param {Object} provider The provider contains the name and url
 * @param {String} packageId Unique identifier for the package
 */
function showDataSet(providerUrl, name) {

  var packageInfo = getPackageInfoByName(providerUrl, name);
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(packageInfo.name);
  importCSVFromWeb(spreadsheet, packageInfo.downloadUrl);
}

/**
 * Load into the spreadsheet with provided full URL of the CSV file
 * @param {Object} spreadsheet
 * @param {String} csvUrl
 */
function importCSVFromWeb(spreadsheet, csvUrl) {
  var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
  var csvData = Utilities.parseCsv(csvContent);
  //spreadsheet = SpreadsheetApp.getActiveSheet();
  spreadsheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
}

/**
 * This function loads a fresh list of packages from a server, or serves
 * a cached version.
 *
 * The returned value is a list of packages with the following keys:
 *  - name
 *  - title
 *  - notes
 *  - downloadUrl
 *
 * It also primes the packageCache variable. This has the same data, but
 * instead of an array, it's an object indexed by the package name.
 */
function loadPackageList(providerUrl) {

  if (providerUrl === lastProviderUrl && packageCache !== null) {
     return Object.values(packageCache);
  }


  const url = providerUrl + '/action/package_search?rows=1000';
  Logger.log(url);
  const response = UrlFetchApp.fetch(url).getContentText();

  const resultObj = JSON.parse(response);

  const packageList = resultObj.result.results.map( function(dataSet) {

    var downloadUrl = null;

    for(var ii = 0; ii < dataSet.resources.length; ii++) {
      var resource = dataSet.resources[ii];
      //if (resource.datastore_active) {
        downloadUrl = resource.url;
      //}
    }

    var title;
    if (dataSet.title.en) {
      title = dataSet.title.en;
    } else {
      title = dataSet.title;
    }


    return {
      name: dataSet.name,
      title: title,
      downloadUrl: downloadUrl,
      notes: dataSet.notes,
    };

  }).filter( function(dataSet) {

     return dataSet.downloadUrl !== null;

  });

  packageCache = {};

  for(var ii = 0; ii < packageList.length; ii++) {
    packageCache[packageList[ii].name] = packageList[ii];
  }

  lastProviderUrl = providerUrl;

  return packageList;

}
