var webpack = require('webpack')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
var path = require('path')
module.exports = {
  plugins: [
    new UglifyJSPlugin({
      uglifyOptions: {
        emca:8,
        mangle:false,
        compress:false,
        output: {
          comments: false,
          beautify:true
        }
      }
    })
  ],
  entry: path.resolve(__dirname, 'app'),
  output: {
    path: __dirname + '/../app/dist',
    publicPath: '/',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loaders: ['babel-loader']},
      {test: /(\.css)$/, loaders: ['style-loader', 'css-loader']},
      {test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ]
  }
}
