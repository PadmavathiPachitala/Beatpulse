import axios from 'axios'

export default function makeAxiosRequest(endpoint){
    let source = axios.CancelToken.source()
    
    const makeRequest = async () => {
        const cancelToken = source.token
        const backendUri = (process.env.REACT_APP_BACK_URI || 'https://beatpulse-fsu7.onrender.com').trim().replace(/[\r\n\s]+$/, '').replace(/\/+$/, '');
        const config = {
            method: 'POST',
            url: backendUri,
            data: {endpoint},
            withCredentials: true,
            cancelToken
        }
        try{
            var result = await axios(config)
        }catch (error){
            if (axios.isCancel(error)) return
            return error
        }
        
        return result.data
    }
    
    return [source, makeRequest]
}

    
    
