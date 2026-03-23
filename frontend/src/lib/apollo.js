import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const apiBaseUrl = import.meta.env.DEV ? "http://localhost:5000" : "";

const link = new HttpLink({
  uri: `${apiBaseUrl}/graphql`,
});

function resetExpiredSession() {
  const token = localStorage.getItem("token");

  if (!token) {
    return;
  }

  localStorage.removeItem("token");
  window.location.replace("/");
}

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const graphQLMessages =
    graphQLErrors?.map((error) => error.message?.toLowerCase?.() || "") || [];

  const hasAuthGraphQLError = graphQLMessages.some(
    (message) =>
      message.includes("unauthorized") ||
      message.includes("jwt expired") ||
      message.includes("invalid token")
  );

  const networkMessage = networkError?.message?.toLowerCase?.() || "";
  const hasAuthNetworkError =
    networkMessage.includes("401") ||
    networkMessage.includes("unauthorized") ||
    networkMessage.includes("jwt expired");

  if (hasAuthGraphQLError || hasAuthNetworkError) {
    resetExpiredSession();
  }
});

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
  link: from([errorLink, authLink, link]),
  cache: new InMemoryCache(),
});
