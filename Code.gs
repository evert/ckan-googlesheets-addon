var SIDEBAR_TITLE = 'CKAN Data Explorer';

var providers = [
  {
    url: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/',
    title: 'City of Toronto',
    datastoreUrl: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/',
  },
  {
    url: 'https://stage.data.ontario.ca/',
    title: 'Ontario',
  },
  {
    url: 'https://open.canada.ca/data/',
    title: 'Canada',
  }
];



/**
 * Adds a custom menu with items to show the sidebar
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  Logger.clear();
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
function getPackageList(providerUrl) {

  const url = providerUrl + 'api/3/action/package_search?rows=1000';
  const response = UrlFetchApp.fetch(url).getContentText();

  const resultObj = JSON.parse(response);

  const packageList = resultObj.result.results.map( function(dataSet) {

    var downloadUrl = null;

    for(var ii = 0; ii < dataSet.resources.length; ii++) {
      var resource = dataSet.resources[ii];
      if (resource.datastore_active) {
        downloadUrl = providerUrl + 'datastore/dump/' + resource.id;
        break;
      }
      if (resource.mimetype === 'text/csv') {
        downloadUrl = resource.url;
        break;
      }
      if (resource.format === 'CSV') {
        downloadUrl = resource.url;
      }
    }

    var title;
    if (dataSet.title.en) {
      title = dataSet.title.en;
    } else {
      title = dataSet.title;
    }

    var description;
    if (dataSet.description && dataSet.description.en) {
      description = dataSet.description.en;
    } else if (dataSet.description) {
      description = dataSet.description;
    } else {
      description = dataSet.notes;
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

  return packageList;

}
