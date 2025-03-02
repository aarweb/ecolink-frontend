const webpack = require('webpack');

module.exports = {
    // Otras configuraciones de webpack...
    plugins: [
        new webpack.ProvidePlugin({
            global: 'window'
        })
    ]
};
