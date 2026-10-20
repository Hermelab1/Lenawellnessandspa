import React from 'react';

const WithUsername = ({ Component, username, ...props }) => {
    return <Component username={username} {...props} />;
};

export default WithUsername;