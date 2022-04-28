class CircularPacking {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */

  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      colorScale: _config.colorScale,
      containerWidth: _config.containerWidth || 1500,
      containerHeight: _config.containerHeight || 700,
      margin: _config.margin || { top: 25, right: 20, bottom: 20, left: 35 },
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
    this.initVis();
    this.dispatcher = _dispatcher;
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // initialize scales
    vis.xScale = d3.scaleBand().range([100, vis.width]);

    vis.colourScale = d3
      .scaleOrdinal()
      .range(d3.schemeSet3)
      .domain([
        'Action',
        'Adventure',
        'Animation',
        'Biography',
        'Comedy',
        'Crime',
        'Drama',
        'Other',
      ]);

    // define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.width)
      .attr('height', vis.height);

    // Append group element that will contain chart and position according to given margins
    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left + 20}, ${vis.config.margin.top})`
      );

    // force simulation

    let row1 = ['Action', 'Adventure', 'Animation', 'Biography'];
    let row2 = [
      'Comedy',
      'Crime',
      'Drama',
      'Fantasy',
      'Family',
      'Sci-Fi',
      'Horror',
      'Mystery',
      'Romance',
    ];

    vis.simulation = d3
      .forceSimulation()
      .force(
        'x',
        d3
          .forceX()
          .strength(0.1)
          .x(function (d) {
            if (d.genre === 'Action') {
              return 100;
            } else if (d.genre === 'Adventure') {
              return 350;
            } else if (d.genre === 'Animation') {
              return 550;
            } else if (d.genre === 'Biography') {
              return 750;
            } else if (d.genre === 'Drama') {
              return 100;
            } else if (d.genre === 'Crime') {
              return 350;
            } else if (d.genre === 'Comedy') {
              return 550;
            } else if (
              d.genre === 'Fantasy' ||
              d.genre === 'Family' ||
              d.genre === 'Sci-Fi' ||
              d.genre === 'Horror' ||
              d.genre === 'Mystery' ||
              d.genre === 'Romance'
            ) {
              return 750;
            }
          })
      )
      .force(
        'y',
        d3
          .forceY()
          .strength(0.1)
          .y(function (d) {
            if (row1.includes(d.genre)) {
              return vis.height / 6;
            } else if (row2.includes(d.genre)) {
              return vis.height - 230;
            }
          })
      )
      .force('charge', d3.forceManyBody().strength(0.5));
    vis.renderLegend();
  }

  updateVis() {
    let vis = this;
    vis.xValue = (d) => d.genre;
    vis.xScale.domain([
      'Action',
      'Adventure',
      'Animation',
      'Biography',
      'Comedy',
      'Crime',
      'Drama',
      'Fantasy',
      'Family',
      'Sci-Fi',
      'Horror',
      'Mystery',
      'Romance',
    ]);
    vis.renderVis();
    if (filterChange) {
      vis.simulation.alpha(1).alphaTarget(0).restart();
    }
  }

  renderVis() {
    let vis = this;

    // radius
    function getRadius(score) {
      if (score > 5 && score < 7) {
        return 4;
      } else if (score > 6 && score < 8) {
        return 8;
      } else if (score > 7 && score < 9) {
        return 16;
      } else if (score > 8 && score < 10) {
        return 32;
      } else if (score > 9 && score < 11) {
        return 64;
      }
    }

    // Add nodes
    const others = [
      'Fantasy',
      'Family',
      'Sci-Fi',
      'Horror',
      'Mystery',
      'Romance',
    ];
    const nodes = vis.chart
      .selectAll('circle')
      .data(vis.data)
      .join('circle')
      .attr('class', 'node')
      .attr('r', (d) => getRadius(d.score))
      .style('fill', function (d) {
        if (others.includes(d.genre)) {
          return vis.colourScale('Other');
        } else {
          return vis.colourScale(d.genre);
        }
      })
      .style('stroke-width', function (d) {
        //check if it's rate filter or not
        if (rate.length !== 0) {
          //only highlight those with filtered rate
          for (let i = 0; i < rate.length; i++) {
            if (d.score >= rate[i].begin && d.score <= rate[i].end) {
              return 3;
            }
          }
          return 1;
        }
        if (
          selectedPoints.includes(d.star) ||
          selectedPoints.includes(d.director) ||
          selectedPoints.includes(d.star.toLowerCase()) ||
          selectedPoints.includes(d.director.toLowerCase())
        ) {
          return 3;
        } else {
          return 1;
        }
      })
      .style('stroke', 'black')
      .style('opacity', function (d) {
        if (rate.length !== 0) {
          for (let i = 0; i < rate.length; i++) {
            if (d.score >= rate[i].begin && d.score <= rate[i].end) {
              return 1.0;
            }
          }
        }
        if (
          selectedPoints.includes(d.star) ||
          selectedPoints.includes(d.director) ||
          selectedPoints.includes(d.star.toLowerCase()) ||
          selectedPoints.includes(d.director.toLowerCase())
        ) {
          return 1.0;
        } else {
          return 0.7;
        }
      })
      .style('stroke-dasharray', function (d) {
        if (rate.length !== 0) {
          for (let i = 0; i < rate.length; i++) {
            if (d.score >= rate[i].begin && d.score <= rate[i].end) {
              return 3;
            }
          }
        }
        return 'none';
      })
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);

    // forces
    vis.simulation
      .nodes(vis.data)
      .force(
        'collide',
        d3
          .forceCollide()
          .strength(1.0)
          .radius((d) => getRadius(d.score))
          .iterations(4)
      )
      .on('tick', function () {
        nodes.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
      });

    //Add click functionality
    nodes.on('click', function (event, d) {
      event.stopPropagation();

      // deselect force chart link
      if (!circleClicked) {
        // selectedPoints = [d.star, d.director];
        filterChange = false;
        circleClicked = true;
        //renderSelected();
      } else {
        //selectedPoints = [];
        filterChange = false;
        circleClicked = false;
        //renderSelected();
      }
      if (
        selectedPoints.includes(
          d.star.toLowerCase() ||
            selectedPoints.includes(d.director.toLowerCase())
        )
      ) {
        selectedPoints = [];
      } else {
        selectedPoints = [d.star.toLowerCase(), d.director.toLowerCase()];
      }
      renderSelected();

      // deselect histogram link
      rate = [];
      vis.dispatcher.call('deselectHistogram', event);
      renderHistoCircle();
    });

    // tooltip
    nodes
      .on('mouseover', (event, d) => {
        d3
          .select('#tooltip-circular-packing')
          .style('display', 'block')
          .style('left', event.pageX + vis.config.tooltipPadding + 'px')
          .style('top', event.pageY + vis.config.tooltipPadding + 'px').html(`
                        <div class="tooltip-title">${d.name} (${d.year})</div>
                        <div><i>${d.director}, ${d.company}</i></div>
                        <ul>
                            <li>Lead Actor: ${d.star}</li>
                            <li>Score: ${d.score}</li>
                            <li>Genre: ${d.genre}</li>
                        </ul>
                    `);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip-circular-packing').style('display', 'none');
      });

    // drag function
    nodes.call(
      d3.drag().on('start', dragstart).on('drag', dragging).on('end', draggend)
    );

    function dragstart(event, d) {
      if (!event.active) vis.simulation.alphaTarget(0.03).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function draggend(event, d) {
      if (!event.active) vis.simulation.alphaTarget(0.03);
      d.fx = null;
      d.fy = null;
    }
  }

  // legend
  renderLegend() {
    let vis = this;
    vis.legend = vis.svg.append('g').attr('transform', `translate(1050,180)`);

    vis.legend
      .append('rect')
      .attr('class', 'outline')
      .attr('width', 250)
      .attr('height', 410)
      .attr('rx', 8);

    vis.legend
      .append('text')
      .attr('class', 'legend-title')
      .attr('x', 125)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .text('Legend');

    vis.legend
      .append('text')
      .attr('class', 'legend-text')
      .attr('x', 125)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .text('Color of the circle');

    let genres = [
      'Action',
      'Adventure',
      'Animation',
      'Biography',
      'Comedy',
      'Crime',
      'Drama',
      'Other',
    ];
    vis.legend
      .selectAll('mydots')
      .data(genres)
      .join('circle')
      .attr('cx', 80)
      .attr('cy', function (d, i) {
        return 75 + i * 25;
      })
      .attr('r', 7)
      .style('fill', (d) => vis.colourScale(d))
      .style('opacity', 0.7)
      .style('stroke-width', 1)
      .style('stroke', 'black');

    vis.legend
      .selectAll('legend-labels')
      .data(genres)
      .join('text')
      .attr('class', 'legend-labels')
      .attr('x', 80 + 25)
      .attr('y', function (d, i) {
        return 75 + i * 25;
      })
      .style('fill', 'black')
      .text(function (d) {
        return d;
      })
      .attr('text-anchor', 'left')
      .style('alignment-baseline', 'middle');

    vis.legend
      .append('text')
      .attr('class', 'legend-text')
      .attr('x', 125)
      .attr('y', 295)
      .attr('text-anchor', 'middle')
      .text('Size of the circle');

    vis.legend
      .selectAll('radius-circle')
      .data([4, 8, 16])
      .join('circle')
      .attr('cx', 60)
      .attr('cy', function (d, i) {
        if (i === 0) {
          return 315;
        } else if (i === 1) {
          return 315 + 25;
        } else {
          return 315 + 60;
        }
      })
      .attr('r', (d) => d)
      .style('stroke-dasharray', '10, 2')
      .style('stroke', 'black')
      .style('stroke-width', 1.5)
      .style('fill', 'none');

    vis.legend
      .selectAll('radius-labels')
      .data([
        'rating score: 6.0-6.9',
        'rating score: 7.0-7.9',
        'rating score: 8.0-8.9',
      ])
      .join('text')
      .attr('class', 'radius-labels')
      .attr('x', 60 + 20)
      .attr('y', function (d, i) {
        if (i === 0) {
          return 315;
        } else if (i === 1) {
          return 315 + 25;
        } else {
          return 315 + 60;
        }
      })
      .style('fill', 'black')
      .text(function (d) {
        return d;
      })
      .attr('text-anchor', 'left')
      .style('alignment-baseline', 'middle');
  }
}
