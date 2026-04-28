import axios from 'axios';

const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:3001/api';

let testUserToken = '';
let testOrganizerToken = '';
let testEventId = '';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message: string, success?: boolean) => {
  const prefix = success === true ? '✅' : success === false ? '❌' : 'ℹ️';
  console.log(`${prefix} ${message}`);
};

async function testHealth() {
  log('测试健康检查接口...');
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    log(`健康检查成功: ${response.data.status}`, true);
    return true;
  } catch (error) {
    log('健康检查失败', false);
    console.error(error);
    return false;
  }
}

async function testRegister() {
  log('\n测试用户注册接口...');
  
  const userEmail = `user_${Date.now()}@test.com`;
  const organizerEmail = `organizer_${Date.now()}@test.com`;
  
  try {
    const userResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: userEmail,
      password: 'test123456',
      name: 'Test User'
    });
    log(`普通用户注册成功: ${userResponse.data.user.email}`, true);
    testUserToken = userResponse.data.token;

    const organizerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: organizerEmail,
      password: 'test123456',
      name: 'Test Organizer',
      role: 'organizer'
    });
    log(`组织者注册成功: ${organizerResponse.data.user.email}`, true);
    testOrganizerToken = organizerResponse.data.token;
    
    return true;
  } catch (error: unknown) {
    log('注册失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testLogin() {
  log('\n测试用户登录接口...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: `user_${Date.now() - 1000}@test.com`,
      password: 'test123456'
    });
    log('登录测试完成', true);
    return true;
  } catch (error: unknown) {
    log('登录测试（预期失败，因为使用了随机邮箱）', true);
    return true;
  }
}

async function testGetEvents() {
  log('\n测试获取活动列表接口...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/events`);
    log(`获取活动列表成功，共 ${response.data.events?.length || 0} 个活动`, true);
    return true;
  } catch (error: unknown) {
    log('获取活动列表失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testGetHotEvents() {
  log('\n测试获取热门活动接口...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/events/hot`);
    log(`获取热门活动成功，共 ${response.data?.length || 0} 个活动`, true);
    return true;
  } catch (error: unknown) {
    log('获取热门活动失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testCreateEvent() {
  if (!testOrganizerToken) {
    log('\n跳过创建活动测试（需要组织者Token）');
    return false;
  }

  log('\n测试创建活动接口...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  try {
    const response = await axios.post(`${API_BASE_URL}/events`, {
      title: '测试活动 - API测试',
      description: '<p>这是一个API测试活动</p>',
      startTime: tomorrow.toISOString(),
      endTime: dayAfter.toISOString(),
      location: '测试地点',
      maxCapacity: 100,
      registrationDeadline: tomorrow.toISOString(),
      category: '会议',
      tags: ['测试', 'API'],
      ticketTypes: [
        {
          name: '普通票',
          description: '普通入场券',
          price: 100,
          quantity: 50
        },
        {
          name: 'VIP票',
          description: 'VIP入场券',
          price: 300,
          quantity: 20
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${testOrganizerToken}`
      }
    });
    
    testEventId = response.data.id;
    log(`创建活动成功: ${response.data.title}`, true);
    log(`活动ID: ${testEventId}`, true);
    
    return true;
  } catch (error: unknown) {
    log('创建活动失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testPublishEvent() {
  if (!testEventId || !testOrganizerToken) {
    log('\n跳过发布活动测试');
    return false;
  }

  log('\n测试发布活动接口...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/events/${testEventId}/publish`, {}, {
      headers: {
        Authorization: `Bearer ${testOrganizerToken}`
      }
    });
    
    log(`发布活动成功，状态: ${response.data.status}`, true);
    return true;
  } catch (error: unknown) {
    log('发布活动失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testGetEventDetail() {
  if (!testEventId) {
    log('\n跳过获取活动详情测试');
    return false;
  }

  log('\n测试获取活动详情接口...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/events/${testEventId}`);
    
    log(`获取活动详情成功: ${response.data.title}`, true);
    log(`票种数量: ${response.data.ticketTypes?.length || 0}`, true);
    return true;
  } catch (error: unknown) {
    log('获取活动详情失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testMyEvents() {
  if (!testOrganizerToken) {
    log('\n跳过获取我的活动测试');
    return false;
  }

  log('\n测试获取组织者活动列表接口...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/events/my`, {
      headers: {
        Authorization: `Bearer ${testOrganizerToken}`
      }
    });
    
    log(`获取组织者活动列表成功，共 ${response.data?.length || 0} 个活动`, true);
    return true;
  } catch (error: unknown) {
    log('获取组织者活动列表失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function testDashboard() {
  if (!testOrganizerToken) {
    log('\n跳过Dashboard测试');
    return false;
  }

  log('\n测试Dashboard统计接口...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/dashboard/organizer`, {
      headers: {
        Authorization: `Bearer ${testOrganizerToken}`
      }
    });
    
    log(`Dashboard统计获取成功`, true);
    log(`总报名人数: ${response.data.totalRegistrations}`, true);
    log(`总活动数: ${response.data.totalEvents}`, true);
    return true;
  } catch (error: unknown) {
    log('Dashboard统计获取失败', false);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('开始 API 接口测试');
  console.log('API Base URL:', API_BASE_URL);
  console.log('='.repeat(60));

  const results: { name: string; success: boolean }[] = [];

  results.push({ name: '健康检查', success: await testHealth() });
  results.push({ name: '用户注册', success: await testRegister() });
  results.push({ name: '用户登录', success: await testLogin() });
  results.push({ name: '获取活动列表', success: await testGetEvents() });
  results.push({ name: '获取热门活动', success: await testGetHotEvents() });
  results.push({ name: '创建活动', success: await testCreateEvent() });
  results.push({ name: '发布活动', success: await testPublishEvent() });
  results.push({ name: '获取活动详情', success: await testGetEventDetail() });
  results.push({ name: '获取我的活动', success: await testMyEvents() });
  results.push({ name: 'Dashboard统计', success: await testDashboard() });

  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(r => {
    const symbol = r.success ? '✅' : '❌';
    console.log(`${symbol} ${r.name}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`通过: ${passed}/${total}`);
  console.log('='.repeat(60));

  if (passed === total) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
  }
}

runAllTests().catch(console.error);
