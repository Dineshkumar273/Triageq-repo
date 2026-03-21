import {ApolloClient, InMemoryCache,HttpLink} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';


const link= new HttpLink({
    uri:'/graphql'
})

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");

  console.log("Sending token:", token); // 🔍 debug

  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(link),
  cache: new InMemoryCache(),
}); 
