export default async function Put(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, unknown> = {}
): Promise<any>{
    try {
        const response: Response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers
            },
            body: JSON.stringify(body)
        });
        return response.json();
    } catch (e) {
        console.log(e);
    }
}
