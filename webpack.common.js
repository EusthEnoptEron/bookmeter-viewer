const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/frontend.ts',
  node: {
    fs: "empty"
  },
  plugins: [
      new MiniCssExtractPlugin({
        filename: 'bundle.css',
      }),
      new CopyPlugin([
          'public'
      ]),
    //   new BundleAnalyzerPlugin()
    ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader', 
        {
          loader: 'webpack-preprocessor-loader',
          options: {
            params: {
              ENV: process.env.WEBPACK_ENV,
            },
            verbose: false,
          },
        }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.fx$/i,
        use: 'raw-loader',
      },
      {
        test: /\.(png|svg|jpg|gif|proto)$/,
        use: [
          'file-loader',
        ],
      }
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};