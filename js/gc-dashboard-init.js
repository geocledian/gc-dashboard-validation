/*
 Vue.js Geocledian Data Validation Dashboard
 
 init script
 
 created: 2021-10-11, jsommer
 updated: 2021-10-11, jsommer
 version: 0.1.0
*/

// root Vue instance
var vmRoot;

// global gc locale object
// every component may append its data to this
var gcLocales = { en: {}, de: {} };

// global i18n object
var i18n;

// init dependent javascript libs
const libs = ['https://unpkg.com/vue@2.6.14/dist/vue.min.js',
              'https://unpkg.com/vue-i18n@8.17.5/dist/vue-i18n.js',
              'https://unpkg.com/split.js@1.6.0/dist/split.min.js',
              'https://cdnjs.cloudflare.com/ajax/libs/axios/0.19.2/axios.min.js',
              '../gc-chart/js/d3.v6.min.js', // v6.7.0
              '../gc-chart/js/billboard.min.js', // v3.1.5
              '../gc-filter/js/gc-filter.js',
              '../gc-datasource/js/gc-datasource.js'
            ];

function gcGetBaseURL() {
    //get the base URL relative to the current script - regardless from where it was called
    // js files are loaded relative to the page
    // css files are loaded relative to its file
    let scriptURL = document.getElementById("gc-dashboard-init");
    let url = new URL(scriptURL.src);
    let basename = url.pathname.substring(url.pathname.lastIndexOf('/')+1);
    return url.href.split('/js/'+basename)[0];
}

function loadJSscriptDeps(url_list, final_callback) {
    /* 
      loads dependent javascript libraries async but in order as given in the url_list. 
      thanks to 
      https://stackoverflow.com/questions/7718935/load-scripts-asynchronously
    */
    function scriptExists(url_to_check) {
      
      let found = false;

      for (var i=0; i< document.head.children.length; i++) {
        const script = document.head.children[i];
        
        // only scripts or links (css) are of interest
        if (!["SCRIPT","LINK"].includes(script.tagName))  { continue; }

        if (script.src === url_to_check) {
          found = true;
          //console.error("Script already loaded: "+ url_to_check)
          break;
        }
      }
      return found;
    }
    function loadNext() {
      //console.debug("length of URLs: "+ url_list.length);
      if (!url_list.length) { 
        console.debug("READY loading dependent libs"); 
        final_callback(); 
      }
  
      let url = url_list.shift();
      //console.debug("current URL: "+ url);

      if (url && !url.includes('http')) {
        url = gcGetBaseURL() + "/" +url;
        console.debug('loadNext()');
        console.debug(url);
      }

      // check google URL for valid key
      if (url && url.includes("YOUR_VALID_API_KEY_FROM_GOOGLE")) { 
        console.error("Change the Google Maps API Key!"); 
        return;
      }

      // prevent multiple loading of same script urls
      if (url && !scriptExists(url)) { 
        let script = document.createElement("script");  // create a script DOM node
        script.type = 'text/javascript';
        script.src = url;  // set its src to the provided URL
        script.async = true;
        // if ready, load the next on in queue
        script.onload = script.onreadystatechange = function () {
          loadNext();
        };
        // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
        document.head.appendChild(script); 
      }
      else { console.warn("URL already loaded - skipping: "+ url); }
    }
    //first call
    loadNext();

}
function initComponent() {
    /* 
      inits component
    */
    i18n = new VueI18n({
      locale: 'en', // set locale
      fallbackLocale: 'en',
      messages: gcLocales, // set locale messages
    })

    // bind index locales to global locales
    gcLocales.de.indexLocales = indexLocales.de;
    gcLocales.en.indexLocales = indexLocales.en;

    /* when ready, init global vue root instance */
    vmRoot = new Vue({
      el: "#gc-app",
      data: {
        dataSource: "",
        filterString: "",
        limit: 5,
        offset: 0,
        language: "en",
        // UI elements
        listActive: true,
        leftColumnShow: true,
        rightColumnShow: true
      },
      i18n: i18n,
      created() {
        console.debug("gc-validation-dashboard-init created!");
        this.selectedParcelId = this.gcParcelId;
        i18n.locale = this.language;
        //i18n for index page
        this.setLocaleForIndexPage();
      },
      mounted: function () {
        console.debug("root mounted!");
    
        //set up listener for changes from child components
        this.$on('filterStringChange', this.filterStringChange);
        this.$on('limitChange', this.limitChange);
        this.$on('offsetChange', this.offsetChange);
        this.$on('dataSourceChange', this.dataSourceChange);

      },
      watch: {
        filterString: function(newValue, oldValue) {
          console.debug("root filterString changed!");
        },
        language (newValue, oldValue) {
          i18n.locale = newValue;
          //i18n for index page
          this.setLocaleForIndexPage();
        },
      },
      computed: {
        gcApikey: {
          get: function() {
            let key = this.getQueryVariable(window.location.search.substring(1), "key");
            return (key ? key : '39553fb7-7f6f-4945-9b84-a4c8745bdbec')
          }
        },
        gcHost: {
          get: function() {
            let host = this.getQueryVariable(window.location.search.substring(1), "host");
            return (host ? host : 'geocledian.com');
          }
        },
        gcParcelId: {
          get: function() {
            let parcel_id = parseInt(this.getQueryVariable(window.location.search.substring(1), "parcel_id"));
            console.debug("root - gcParcelId: "+parcel_id);
            return parcel_id;
          }
        },
        gcApiBaseUrl: {
          get() {
            return "/agknow/api/v4"
          }
        }
      },
      methods: {
        /* events for listening on child events */
        filterStringChange: function (filterString) {
          this.filterString = filterString;
        },
        limitChange: function (limit) {
          this.limit = limit;
        },
        offsetChange: function (offset) {
          this.offset = offset;
        },
        dataSourceChange: function (source) {
          this.dataSource = source;
        },
        //https://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
        getQueryVariable: function (query, variable) {
          var vars = query.split('&');
          for (var i = 0; i < vars.length; i++) {
              var pair = vars[i].split('=');
              if (decodeURIComponent(pair[0]) == variable) {
                  return decodeURIComponent(pair[1]);
              }
          }
          console.log('Query variable %s not found', variable);
        },
        getAnalystsDashboardLink: function () {
          /* returns a dynamic link to the Analyst's Dashboard */
    
          let apiKey = "";
          let host = "";
          if (this.gcApikey) {
            apiKey = this.gcApikey;
          }
          if (this.gcHost) {
            host = this.gcHost;
          }
          return "https://geocledian.com/agclient/analyst/?key="+apiKey + "&host=" +host;
        },
        setLocaleForIndexPage() {
          /* translate navbar elements */
          document.getElementById("navbarProductOverview").innerHTML = i18n.t("indexLocales.navbar.productOverview")
          document.getElementById("navbarAboutUs").innerHTML = i18n.t("indexLocales.navbar.about");
          document.getElementById("allRightsReserved").innerHTML = i18n.t("indexLocales.footer.allRightsReserved");

          try { document.getElementById("navbarCropPerformance").innerHTML = i18n.t("indexLocales.navbar.cropPerformance"); } catch (ex) {}
          try { document.getElementById("navbarAnalyst").innerHTML = i18n.t("indexLocales.navbar.analyst"); } catch (ex) {}
          try { document.getElementById("navbarPortfolio").innerHTML = i18n.t("indexLocales.navbar.portfolio"); } catch (ex) {}
          try { document.getElementById("navbarZones").innerHTML = i18n.t("indexLocales.navbar.zones"); } catch (ex) {}
        }
      }
    });
}
function loadJSscript (url, callback) {
    /* 
      loads javascript library async and appends it to the DOM
      */
    let script = document.createElement("script");  // create a script DOM node
    script.type = 'text/javascript';
    script.src = gcGetBaseURL() + "/"+ url;  // set its src to the provided URL
    script.async = true;
    document.head.appendChild(script);  // add it to the end of the head section of the page
    //if ready, call the callback function 
    script.onload = script.onreadystatechanged = function () {
      if (callback) { callback(); }
    };
}

// async loading dependencies and init the component
loadJSscriptDeps(libs, initComponent);   


Date.prototype.simpleDate = function () {
  var a = this.getFullYear(),
      b = this.getMonth() + 1,
      c = this.getDate();
  return a + "-" + (1 === b.toString().length ? "0" + b : b) + "-" + (1 === c.toString().length ? "0" + c : c)
}
