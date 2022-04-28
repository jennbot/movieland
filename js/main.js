// Global Objects
let globalData,
  actors,
  directors,
  originalLinks,
  nodes,
  forceDirectedGraph,
  movieByActor,
  movieByDirector,
  forceChartData,
  originalForceData,
  forceData,
  histogram_chart,
  filteredData,
  circlePack,
  runTimeFilteredData,
  originalData,
  dispatcher,
  globalYear,
  globalRunTime;
let selectedPoints = [];
let filterChange = false;
//yield array of rate ranges in object
let rate = [];
let circleClicked = false;
let forceClicked = false;

/**
 * Load data from CSV file asynchronously and render charts
 */
d3.csv('data/movies.csv')
  .then((data) => {
    // Convert columns to numerical values
    data.forEach((d) => {
      Object.keys(d).forEach((attr) => {
        if (
          attr !== 'name' &&
          attr !== 'genre' &&
          attr !== 'director' &&
          attr !== 'writer' &&
          attr !== 'star' &&
          attr !== 'country' &&
          attr !== 'company'
        ) {
          d[attr] = +d[attr];
        }
      });
    });

    // Filtered data
    filteredData = data.filter(function (d) {
      return (
        d.score > 6.5 && d.votes >= 50000 && d.year < 2021 && d.year > 2010
      );
    });
    runTimeFilteredData = filteredData;
    globalRunTime = '0';
    globalYear = [2011, 2020];

    originalData = filteredData;

    globalData = filteredData.filter((d) => d.score >= 7.8);
    forceChartData = globalData;
    originalForceData = globalData;
    //initialize dispatcher
    dispatcher = d3.dispatch('filterYear', 'filterRate', 'deselectHistogram');

    // Initialize Charts
    circlePack = new CircularPacking(
      {
        parentElement: '#circular-packing',
      },
      filteredData,
      dispatcher
    );
    circlePack.updateVis();

    histogram_chart = new Histogram(
      {
        parentElement: '#histogram',
      },
      filteredData,
      dispatcher,
      circlePack.colourScale
    );
    histogram_chart.updateVis();

    processForceChartData('default');

    forceDirectedGraph = new ForceDirectedGraph(
      { parentElement: '#force-directed-graph' },
      forceData,
      dispatcher
    );

    let slider = new Slider(
      {
        parentElement: '#slider',
      },
      filteredData,
      dispatcher
    );
    slider.updateVis();

    //dispatcher for year filtering
    dispatcher.on('filterYear', (year) => {
      globalYear = year;
      filterChange = true;

      let filteredYearData = originalData.filter(function (d) {
        return d.year <= year[1] && d.year >= year[0];
      });

      filteredYearData = dispatchFilterRunTime(
        { id: 'runtime', time: globalRunTime },
        filteredYearData
      );
      circlePack.data = filteredYearData;
      histogram_chart.data = filteredYearData;
      processForceChartData({ id: 'runtime', time: globalRunTime });
      circlePack.updateVis();
      histogram_chart.updateVis();
    });

    //dispatcher to deselect histogram
    dispatcher.on('deselectHistogram', (event) => {
      d3.selectAll('.selected').classed('selected', false);
      histogram_chart.updateVis();
    });

    //dispatcher for rate filtering
    dispatcher.on('filterRate', (event) => {
      circlePack.updateVis();
    });
  })
  .catch((error) => console.error(error));

function dispatchFilterRunTime(mode, data) {
  let runtimeData;
  if (mode.id === 'runtime') {
    switch (mode.time) {
      case '0':
        runtimeData = data;
        break;
      case '1':
        runtimeData = data.filter((d) => d.runtime <= 100);
        break;
      case '2':
        runtimeData = data.filter((d) => d.runtime > 100 && d.runtime <= 120);
        break;
      case '3':
        runtimeData = data.filter((d) => d.runtime > 120 && d.runtime <= 150);
        break;
      case '4':
        runtimeData = data.filter((d) => d.runtime > 150);
        break;
      default:
    }
  }
  return runtimeData;
}

function processForceChartData(mode) {
  if (mode.id === 'runtime') {
    switch (mode.time) {
      case '0':
        globalData = originalForceData.filter(function (d) {
          return d.year <= globalYear[1] && d.year >= globalYear[0];
        });
        break;
      case '1':
        globalData = originalForceData
          .filter((d) => d.runtime <= 100)
          .filter(function (d) {
            return d.year <= globalYear[1] && d.year >= globalYear[0];
          });
        break;
      case '2':
        globalData = originalForceData
          .filter((d) => d.runtime > 100 && d.runtime <= 120)
          .filter(function (d) {
            return d.year <= globalYear[1] && d.year >= globalYear[0];
          });
        break;
      case '3':
        globalData = originalForceData
          .filter((d) => d.runtime > 120 && d.runtime <= 150)
          .filter(function (d) {
            return d.year <= globalYear[1] && d.year >= globalYear[0];
          });
        break;
      case '4':
        globalData = originalForceData
          .filter((d) => d.runtime > 150)
          .filter(function (d) {
            return d.year <= globalYear[1] && d.year >= globalYear[0];
          });
        break;
      default:
    }
  }
  originalLinks = globalData.map((d) => {
    return {
      source: d.director,
      target: d.star,
      value: 1,
    };
  });
  actors = globalData.map((a) => a.star);
  let uniqueActors = [...new Set(actors)];

  directors = globalData.map((d) => d.director);
  let uniqueDirectors = [...new Set(directors)];
  uniqueDirectors = uniqueDirectors.map((d) => {
    return { id: d, group: 1 };
  });
  uniqueActors = uniqueActors.map((d) => {
    return { id: d, group: 2 };
  });

  movieByActor = d3.group(globalData, (d) => d.star);
  movieByDirector = d3.group(globalData, (d) => d.director);
  nodes = uniqueActors.concat(uniqueDirectors);

  //This cleans data for people who are actors and directors.
  // https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
  const ids = nodes.map((o) => o.id);
  let filtered = nodes.filter(({ id }, index) => !ids.includes(id, index + 1));

  forceData = {
    nodes: filtered,
    links: originalLinks,
  };

  if (mode !== 'default') {
    forceDirectedGraph.data = forceData;
    forceDirectedGraph.updateVis();
  }
}

function search() {
  select = document.getElementById('searchInput');
  //https://stackoverflow.com/questions/24718349/how-do-i-make-array-indexof-case-insensitive
  indexOf = (arr, q) =>
    arr.findIndex((item) => q.toLowerCase() === item.toLowerCase());

  if (
    indexOf(actors, select.value) >= 0 ||
    indexOf(directors, select.value) >= 0
  ) {
    selectedPoints = [select.value.toLowerCase()];
    filterChange = false;
    renderSelected();
  } else {
    alert('Performer not found');
  }
}

// force direct and circle packing bidirectional highlight
function renderSelected() {
  forceDirectedGraph.updateVis();
  circlePack.updateVis();
}

function renderHistoCircle() {
  circlePack.updateVis();
  histogram_chart.updateVis();
}

function runTimeFilter(value) {
  filterChange = true;
  globalRunTime = value;
  processForceChartData({ id: 'runtime', time: value });

  let tempFilterYearData = originalData.filter(function (d) {
    return d.year <= globalYear[1] && d.year >= globalYear[0];
  });

  tempFilterYearData = dispatchFilterRunTime(
    { id: 'runtime', time: value },
    tempFilterYearData
  );

  histogram_chart.data = tempFilterYearData;
  circlePack.data = tempFilterYearData;
  histogram_chart.updateVis();
  circlePack.updateVis();
}
